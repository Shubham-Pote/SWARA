"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const database_1 = __importDefault(require("./config/database"));
const socketServer_1 = require("./websocket/socketServer");
// ────────────────────────────────────────────────────────────
// REST route imports
// ────────────────────────────────────────────────────────────
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const lesson_routes_1 = __importDefault(require("./routes/lesson.routes"));
const notes_routes_1 = __importDefault(require("./routes/notes.routes"));
const readingArticle_routes_1 = __importDefault(require("./routes/readingArticle.routes"));
const character_routes_1 = __importDefault(require("./routes/character.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const vrm_routes_1 = __importDefault(require("./routes/vrm.routes"));
// ────────────────────────────────────────────────────────────
// Environment & DB
// ────────────────────────────────────────────────────────────
dotenv_1.default.config({ path: path_1.default.join(__dirname, '.env') });
(0, database_1.default)();
// ────────────────────────────────────────────────────────────
// Express + HTTP server bootstrap
// ────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
const server = http_1.default.createServer(app); // share port with Socket.IO
const io = (0, socketServer_1.initWebsocketLayer)(server); // websocket namespaces
app.set("io", io); // expose to controllers
// ────────────────────────────────────────────────────────────
// Global middleware
// ────────────────────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// Static audio (lesson mp3/ogg)
app.use("/audio", express_1.default.static(path_1.default.join(__dirname, "../public/audio")));
// ────────────────────────────────────────────────────────────
// Welcome
// ────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({
    message: "Welcome to the Language Learning API",
    features: [
        "Traditional Lessons",
        "Notes & Reading",
        "AI Characters (real-time chat & VRM animation)"
    ]
}));
// ────────────────────────────────────────────────────────────
// REST routes
// ────────────────────────────────────────────────────────────
app.use("/api/auth", auth_routes_1.default);
app.use("/api/lessons", lesson_routes_1.default);
app.use("/api/notes", notes_routes_1.default);
app.use("/api/reading", readingArticle_routes_1.default);
// Character routes enabled for authentication endpoints
app.use("/api/character", character_routes_1.default);
app.use("/api/settings", settings_routes_1.default);
app.use("/api/vrm", vrm_routes_1.default);
app.use("/api/vrm", vrm_routes_1.default);
// ────────────────────────────────────────────────────────────
// Error handler
// ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ success: false, message: "Something broke!" });
});
// ────────────────────────────────────────────────────────────
// Start server
// ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 REST & WebSocket server running at http://localhost:${PORT}`));
//# sourceMappingURL=index.js.map