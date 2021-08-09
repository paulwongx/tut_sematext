const winston = require("winston");

const options = {
	file: {
		level: "info",
		filename: "./logs/app.log",
		handleExceptions: true,
		json: true,
		maxsize: 5242880, // 5MB
		maxFiles: 5,
		colorize: false,
	},
	console: {
		level: "debug",
		format: winston.format.combine(
			winston.format.cli(),
			winston.format.splat()
		),
		handleExceptions: true,
		json: false,
		colorize: true,
	},
};

const logger = winston.createLogger({
	levels: winston.config.npm.levels,
	transports: [
		new winston.transports.File(options.file),
		new winston.transports.Console(options.console),
	],
	exitOnError: false,
});

module.exports = logger;

// 0: error
// 1: warn
// 2: info
// 3: verbose
// 4: debug
// 5: silly
