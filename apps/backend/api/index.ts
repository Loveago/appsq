import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';

let server: any;

async function bootstrapServer() {
  if (!server) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
    server = expressApp;
  }
  return server;
}

export default async function handler(req: Request, res: Response) {
  try {
    const expressServer = await bootstrapServer();
    return expressServer(req, res);
  } catch (error: any) {
    console.error('Vercel serverless invocation error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error during backend bootstrap',
      error: error?.message || String(error),
      stack: error?.stack,
    });
  }
}
