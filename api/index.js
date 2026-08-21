/* Vercel serverless — نقطة الدخول للـ API (البيانات من Firebase مباشرة، بدون خادم محلي) */
import { createApp } from "../server/src/app.js";

export const config = { maxDuration: 60 };

export default createApp();
