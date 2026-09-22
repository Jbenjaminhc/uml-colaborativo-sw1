"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./db"));
const socket_1 = require("./socket");
dotenv_1.default.config();
const start = (port) => {
    try {
        const httpServer = http_1.default.createServer(app_1.default);
        const io = (0, socket_1.initializeSocketIO)(httpServer);
        app_1.default.set('io', io);
        httpServer.listen(port, () => {
            console.log(`Server listening on ${port}`);
        });
        (0, db_1.default)();
    }
    catch (err) {
        console.error(err);
        process.exit();
    }
};
start(parseInt(process.env.PORT || '5000', 10));
//# sourceMappingURL=index.js.map