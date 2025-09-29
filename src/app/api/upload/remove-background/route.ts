import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Инициализация S3 клиента
const s3Client = new S3Client({
  endpoint: process.env.S3_URL,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.PICTURES_TRIAL_TEST_BUCKET_S3_ACCESS_KEY!,
    secretAccessKey: process.env.PICTURES_TRIAL_TEST_BUCKET_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.PICTURES_TRIAL_TEST_BUCKET!;

// Функция для извлечения ключа из URL
function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Убираем первый пустой элемент и название bucket
    pathParts.shift(); // убираем ""
    pathParts.shift(); // убираем bucket name
    return pathParts.join('/');
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
}

// Функция для генерации имени файла с удаленным фоном
function generateProcessedFileName(originalKey: string): string {
  const pathParts = originalKey.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const nameWithoutExt = fileName.split('.')[0];
  const ext = fileName.split('.').pop();
  return `${pathParts.slice(0, -1).join('/')}/${nameWithoutExt}_no_bg.${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL изображения не указан' },
        { status: 400 }
      );
    }

    // Извлекаем ключ из URL
    const originalKey = extractKeyFromUrl(imageUrl);
    if (!originalKey) {
      return NextResponse.json(
        { error: 'Некорректный URL изображения' },
        { status: 400 }
      );
    }

    // Генерируем имя для обработанного файла
    const processedKey = generateProcessedFileName(originalKey);

    // Проверяем, существует ли уже обработанная версия
    try {
      const checkCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: processedKey,
      });
      await s3Client.send(checkCommand);
      
      // Если файл уже существует, возвращаем его URL
      const processedUrl = `${process.env.S3_URL}/${BUCKET_NAME}/${processedKey}`;
      return NextResponse.json({
        success: true,
        originalUrl: imageUrl,
        processedUrl: processedUrl,
        message: 'Обработанное изображение уже существует'
      });
    } catch (error) {
      // Файл не существует, продолжаем обработку
    }

    // Скачиваем оригинальное изображение из S3
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: originalKey,
    });

    const response = await s3Client.send(getCommand);
    const imageData = await response.Body?.transformToByteArray();
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Не удалось загрузить изображение' },
        { status: 400 }
      );
    }

    // Создаем временные файлы в системной временной папке
    const tempDir = os.tmpdir();
    const inputFileName = `input_${randomUUID()}.jpg`;
    const inputPath = path.join(tempDir, inputFileName);

    // Убеждаемся, что временная папка существует
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log('Temporary directory:', tempDir);
    console.log('Input path:', inputPath);

    try {
      // Сохраняем оригинальное изображение во временный файл
      fs.writeFileSync(inputPath, Buffer.from(imageData));
      console.log('Image saved successfully to:', inputPath);

      // Запускаем Python скрипт для удаления фона
      const pythonScript = path.join(process.cwd(), 'scripts', 'remove_background.py');
      console.log('Python script path:', pythonScript);
      
      // Проверяем существование Python скрипта
      if (!fs.existsSync(pythonScript)) {
        throw new Error(`Python script not found at: ${pythonScript}`);
      }

      // Пробуем разные варианты команды Python
      let pythonCommand = 'python';
      const pythonCommands = ['python', 'python3', 'py'];
      
      for (const cmd of pythonCommands) {
        try {
          const testProcess = spawn(cmd, ['--version'], { stdio: 'pipe' });
          await new Promise((resolve) => testProcess.on('close', resolve));
          pythonCommand = cmd;
          console.log('Using Python command:', pythonCommand);
          break;
        } catch (error) {
          continue;
        }
      }
      
      const pythonProcess = spawn(pythonCommand, [pythonScript, inputPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Ждем завершения процесса
      const exitCode = await new Promise((resolve) => {
        pythonProcess.on('close', resolve);
      });

      console.log('Python process exit code:', exitCode);
      console.log('Python stdout:', stdout);
      if (stderr) console.log('Python stderr:', stderr);

      if (exitCode !== 0) {
        console.error('Python script error:', stderr);
        return NextResponse.json(
          { error: 'Ошибка обработки изображения', details: stderr },
          { status: 500 }
        );
      }

      // Парсим результат из JSON
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (parseError) {
        console.error('Failed to parse Python output:', stdout);
        return NextResponse.json(
          { error: 'Ошибка парсинга результата обработки' },
          { status: 500 }
        );
      }

      if (!result.success) {
        return NextResponse.json(
          { error: 'Ошибка обработки изображения', details: result.error },
          { status: 500 }
        );
      }

      // Конвертируем base64 обработанного изображения в Buffer
      const processedImageBuffer = Buffer.from(result.processed, 'base64');

      // Загружаем обработанное изображение в S3
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: processedKey,
        Body: processedImageBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      });

      await s3Client.send(putCommand);
      console.log('Processed image uploaded to S3:', processedKey);

      // Формируем URL обработанного изображения
      const processedUrl = `${process.env.S3_URL}/${BUCKET_NAME}/${processedKey}`;

      return NextResponse.json({
        success: true,
        originalUrl: imageUrl,
        processedUrl: processedUrl,
        message: 'Фон успешно удален'
      });

    } finally {
      // Очищаем временные файлы
      try {
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
          console.log('Temporary file cleaned up:', inputPath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
    }

  } catch (error) {
    console.error('Remove background error:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка удаления фона', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
