const CONFIG = require('./config');
const https = require('https');
// Cron jobs library
const scheduled = require("scheduled");
const TelegramBot = require('node-telegram-bot-api');

// Telegram bot setup
const Telegramtoken = CONFIG.telegramToken;
const bot = new TelegramBot(Telegramtoken, { polling: true });

let message = "";
let startDate = "";

let currentAppointmentDate = '30/03/2023';
let currentAppointmentTime = '10:10';

function convertDate(date) {
	let startDateYear = date.split("/").pop();
	let startDateMonth = date.slice(3, 5);
	let startDateDay = date.slice(0, 2);
	let formattedDate = startDateYear + '-' + startDateMonth + '-' + startDateDay;
	formattedDate = new Date(formattedDate).toISOString();
	return formattedDate;
}

const options = {
	hostname: CONFIG.hostname,
	path: CONFIG.path,
	method: 'GET',
	headers: {
		'Content-Type': 'application/json'
	}
};

// listen to 'cita' execution from Telegram bot
bot.onText(/\/cita/, (msg) => {
	checkAvailability(msg);
	setTimeout(function () {
		sendMessage(msg.chat.id, msg.chat.username, message);
	}, 5000);
});

function sendMessage(telegramId, telegramUsername, message) {
	message = `Hola, ${telegramUsername}
	${message}`;
	bot.sendMessage(telegramId, message);
}

async function checkAvailability() {
	const req = https.request(options, (res) => {
		let data = '';

		res.on('data', (chunk) => {
			data += chunk
		});

		res.on('end', () => {
			const responseData = JSON.parse(data);
			const firstAvailable = responseData.return.results.availabilities[0];
			startDate = firstAvailable.start_date;
			const startDateDayWeek = firstAvailable.start_date_day_week;
			const startTime = firstAvailable.startTime;
			const doctor = firstAvailable.resourceName;
			const hospital = firstAvailable.areaTitle;
			const direccion = firstAvailable.address;
			const ciudad = firstAvailable.city;
			const linkCita = CONFIG.linkCita;

			message = `La siguiente cita disponible con ${doctor} es el día: 
			${startDate}
			, ${startDateDayWeek} a las ${startTime} 
			en ${hospital}, ${direccion}, ${ciudad}.
			${linkCita}
			Cita actual: ${currentAppointmentDate} a las ${currentAppointmentTime}.	
			`;
		});

	});
	
	req.on('error', (error) => {
		console.error('checkAvailability error: ' + error);
	});

	req.end();
};

const scheduledJob = new scheduled({
	id: "scheduledJob",
	pattern: "*/5 * * * *", // Execute once every 5 minutes
	task: function initEach5Minutes() {
		checkAvailability();

		let currentAppointmentFormattedDate = convertDate(currentAppointmentDate);

		setTimeout(function () {
			let startFormattedDate = convertDate(startDate);
			if (startFormattedDate < currentAppointmentFormattedDate) {
				sendMessage(10553933, 'Sergitxu', message);
			}
		}, 5000);
	}
}).start();
