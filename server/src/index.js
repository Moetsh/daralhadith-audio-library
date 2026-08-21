import { createApp } from "./app.js";

const PORT = process.env.PORT || 4000;
createApp().listen(PORT, () => console.log("✦ مكتبة دار الحديث — API يعمل على http://localhost:" + PORT));
