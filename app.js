// --------------------------------------------------------
// Begin Initialize
// --------------------------------------------------------

import "dotenv/config";

import WhatsAppWebJS from "whatsapp-web.js";
import QrCode from "qrcode-terminal";
import MySQL from "mysql2/promise";
import DateFormat from "dateformat";

const { Client, LocalAuth, Location } = WhatsAppWebJS;

const APP_NAME = process.env.APP_NAME;
const CLIENT_ID = process.env.CLIENT_ID;
const SESSION_TIME = process.env.SESSION_TIME;

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: CLIENT_ID,
  }),
  puppeteer: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

const officeLocation = new Location(-6.8693818, 107.5541125, {
  name: 'BLUD Air Minum Kota Cimahi',
  address: '4HJ3+7X7, Citeureup, Kec. Cimahi Utara, Kota Cimahi, Jawa Barat 40512',
  url: 'https://google.com'
})

// --------------------------------------------------------
// End Initialize
// --------------------------------------------------------

// --------------------------------------------------------
// Begin Database Service
// --------------------------------------------------------

const connection = async () => {
  return await MySQL.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
};

const startSession = async (from) => {
  const db = await connection();
  const query = "INSERT INTO `wa_sessions` (`from`, `expired_at`) VALUES (?, UNIX_TIMESTAMP() + ?)";
  await db.execute(query, [from, SESSION_TIME]);
  await db.end();
};

const updateContext = async (from, context) => {
  const db = await connection();
  const query = "UPDATE `wa_sessions` SET `context` = ?, `expired_at` = UNIX_TIMESTAMP() + ? WHERE `from` = ? AND `expired_at` > UNIX_TIMESTAMP()";
  await db.execute(query, [context, SESSION_TIME, from]);
  await db.end();
};

const updateSubject = async (from, subject) => {
  const db = await connection();
  const query = "UPDATE `wa_sessions` SET `subject` = ?, `expired_at` = UNIX_TIMESTAMP() + ? WHERE `from` = ? AND `expired_at` > UNIX_TIMESTAMP()";
  await db.execute(query, [subject, SESSION_TIME, from]);
  await db.end();
};

const getSession = async (from) => {
  const db = await connection();
  const query = "SELECT `id`, `context`, `subject` FROM `wa_sessions` WHERE `from` = ? AND `expired_at` > UNIX_TIMESTAMP() ORDER BY `expired_at` DESC LIMIT 1";
  const [rows] = await db.query(query, [from]);
  await db.end();
  return rows[0] || false;
};

const getCustomer = async (id) => {
  const db = await connection();
  const query = "SELECT `a`.`pel_no`, `a`.`pel_nama`, `a`.`pel_alamat`, `e`.`kel_ket`, `f`.`kec_ket`, `a`.`dkd_kd`, `c`.`gol_ket`, `d`.`um_ukuran`, `b`.`kps_ket` FROM `tm_pelanggan` `a` JOIN `tr_kondisi_ps` `b` ON `b`.`kps_kode` = `a`.`kps_kode` JOIN `tr_gol` `c` ON `c`.`gol_kode` = `a`.`gol_kode` JOIN `tr_ukuranmeter` `d` ON `d`.`um_kode` = `a`.`um_kode` JOIN `tr_kelurahan` `e` ON `e`.`kel_kode` = `a`.`kel_kode` JOIN `tr_kecamatan` `f` ON `f`.`kec_kode` = `e`.`kec_kode` WHERE `a`.`pel_no` = ?";
  const [rows] = await db.query(query, [id]);
  await db.end();
  return rows[0] || false;
};

const checkCustomer = async (id) => {
  const db = await connection();
  const query = "SELECT `pel_no` FROM `tm_pelanggan` WHERE `pel_no` = ?";
  const [rows] = await db.query(query, [id]);
  await db.end();
  return rows[0] || false;
};

const getBills = async (id) => {
  const db = await connection();
  const query = "SELECT `rek_thn`, `rek_bln`, `rek_stankini` - `rek_stanlalu` AS `rek_pakai`, `rek_uangair`, `rek_adm` + `rek_meter` AS `rek_beban`, `getDenda`(`rek_total`, `rek_bln`, `rek_thn`, `rek_gol`) AS `rek_denda`, `getDenda`(`rek_total`, `rek_bln`, `rek_thn`, `rek_gol`) + `rek_total` AS `rek_total` FROM `tm_rekening` WHERE `rek_sts` = 1 AND `rek_byr_sts` = 0 AND `pel_no` = ?";
  const [rows] = await db.query(query, [id]);
  await db.end();
  return rows || false;
};

const getHistories = async (id) => {
  const db = await connection();
  const query = "SELECT `a`.`rek_thn`, `a`.`rek_bln`, `a`.`rek_stankini` - `a`.`rek_stanlalu` AS `rek_pakai`, `b`.`byr_total`, `c`.`kar_nama`, DATE_FORMAT(`b`.`byr_tgl`, '%e') AS `byr_tgl`, DATE_FORMAT(`b`.`byr_tgl`, '%c') AS `byr_bln`, DATE_FORMAT(`b`.`byr_tgl`, '%Y') AS `byr_thn` FROM `tm_rekening` `a` JOIN `tm_pembayaran` `b` ON `b`.`rek_nomor` = `a`.`rek_nomor` AND `b`.`byr_sts` > 0 JOIN `tm_karyawan` `c` ON `c`.`kar_id` = `b`.`kar_id` WHERE `a`.`rek_sts` = 1 AND `a`.`pel_no` = ? ORDER BY `a`.`rek_nomor` DESC LIMIT 5";
  const [rows] = await db.query(query, [id]);
  await db.end();
  return rows || false;
};

const getInformation = async () => { };

const storeComplaint = async () => { };

const getComplaint = async (id) => { };

// --------------------------------------------------------
// End Database Service
// --------------------------------------------------------

// --------------------------------------------------------
// Begin Helpers
// --------------------------------------------------------

const monthFormatter = (value) => {
  const month = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  let formatted = month[value];
  return formatted;
};

const rupiahFormatter = (number) => {
  let tempNum = String(number).split("").reverse();
  let formatted = "";
  for (let i = 0; i < tempNum.length; i++) {
    if ((i + 1) % 3 == 0 && i != tempNum.length - 1) {
      tempNum[i] = `.${tempNum[i]}`;
    }
  }
  formatted = `Rp. ${tempNum.reverse().join("")}`;
  return formatted;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const time = () => {
  const date = new Date();
  const time = DateFormat(date, "HH:MM");
  if (time >= "04:00" && time < "10:00") {
    return "pagi";
  } else if (time >= "10:00" && time < "16:00") {
    return "siang";
  } else if (time >= "16:00" && time < "19:00") {
    return "sore";
  } else if (time >= "19:00" && time < "04:00") {
    return "malam";
  }
};

// --------------------------------------------------------
// End Helpers
// --------------------------------------------------------

// --------------------------------------------------------
// Begin Message Template
// --------------------------------------------------------

const greetingMessage = async () => {
  let message = ``;
  message += `Halo, selamat ${time()}! Saya adalah Bot Asisten BLUD Air Minum Kota Cimahi. Apa yang bisa Saya bantu?\n`;
  message += `1. Informasi Pelanggan\n`;
  message += `2. Informasi Tagihan\n`;
  message += `3. Riwayat Pembayaran\n`;
  message += `4. Pembayaran Tagihan\n`;
  message += `5. Pemasangan Baru\n`;
  message += `6. Pengaduan Pelanggan\n`;
  message += `7. Status Pengaduan\n`;
  message += `8. Informasi Gangguan\n`;
  message += `9. Kantor Pelayanan\n`;
  message += `Anda bisa mengetikan angka dari pilihan di atas sesuai dengan informasi yang dibutuhkan.`;
  return message;
};

const askSubjectMessage = async () => {
  let message = ``;
  message += `Berapa nomor pelanggan Anda?`;
  return message;
};

const askContextMessage = async () => {
  let message = ``;
  message += `Untuk melakukan pengecekan dengan nomor pelanggan yang berbeda, Anda bisa langsung mengetikan nomor pelanggan lagi.\n\n`;
  message += `Atau bisa mengetikan angka dari pilihan di bawah untuk mendapatkan informasi lainnya.\n`;
  message += `1. Informasi Pelanggan\n`;
  message += `2. Informasi Tagihan\n`;
  message += `3. Riwayat Pembayaran\n`;
  message += `4. Pembayaran Tagihan\n`;
  message += `5. Pemasangan Baru\n`;
  message += `6. Pengaduan Pelanggan\n`;
  message += `7. Status Pengaduan\n`;
  message += `8. Informasi Gangguan\n`;
  message += `9. Kantor Pelayanan`;
  return message;
};

const customerMessage = async (customer) => {
  let message = ``;
  message += `Berikut adalah informasi dari Pelanggan dengan Nomor ${customer.pel_no}.\n\n`;
  message += `Nomor Pelanggan : ${customer.pel_no}\n`;
  message += `Nama Lengkap : ${customer.pel_nama}\n`;
  message += `Alamat : ${customer.pel_alamat}\n`;
  message += `Kelurahan : ${customer.kel_ket}\n`;
  message += `Kecamatan : ${customer.kec_ket}\n`;
  message += `Rayon Baca : ${customer.dkd_kd}\n`;
  message += `Golongan : ${customer.gol_ket}\n`;
  message += `Ukuran WM : ${customer.um_ukuran}\n`;
  message += `Status : ${customer.kps_ket}`;
  return message;
};

const billsMessage = async (customerNo, bills) => {
  let message = ``;
  let billCount = 0;
  let billTotal = 0;
  message += `Berikut adalah tagihan Anda dengan Nomor Pelanggan ${customerNo}.\n\n`;
  for (let bill of bills) {
    message += `Periode ${monthFormatter(bill.rek_bln)} ${bill.rek_thn}\n`;
    message += `Pemakaian Air : ${bill.rek_pakai} m3\n`;
    message += `Uang Air : ${rupiahFormatter(bill.rek_uangair)}\n`;
    message += `Beban Tetap : ${rupiahFormatter(bill.rek_beban)}\n`;
    message += `Denda : ${rupiahFormatter(bill.rek_denda)}\n`;
    message += `Total : ${rupiahFormatter(bill.rek_total)}\n`;
    message += `\n`;
    billTotal += bill.rek_total;
    billCount++;
  }
  message += `Jumlah : ${billCount} bulan\n`;
  message += `Total Tagihan : ${rupiahFormatter(billTotal)}`;
  return message;
};

const historiesMessage = async (customerNo, histories) => {
  let message = ``;
  let i = 0;
  message += `Berikut adalah riwayat pembayaran 5 bulan terakhir Anda dengan Nomor Pelanggan ${customerNo}.\n\n`;
  for (let history of histories) {
    if (i > 0) message += `\n\n`;
    message += `Periode ${monthFormatter(history.rek_bln)} ${history.rek_thn}\n`;
    message += `Tanggal Bayar : ${history.byr_tgl} ${monthFormatter(history.byr_bln)} ${history.byr_thn}\n`;
    message += `Loket : ${history.kar_nama}\n`;
    message += `Pemakaian Air : ${history.rek_pakai} m3\n`;
    message += `Total : ${rupiahFormatter(history.byr_total)}`;
    i++;
  }
  return message;
};

const paymentMessage = async () => {
  let message = ``;
  message += `Mohon maaf, fitur sedang dalam pengembangan.`;
  return message;
};

const registrationMessage = async () => {
  let message = ``;
  message += `Mohon maaf, fitur sedang dalam pengembangan.`;
  return message;
};

const complaintMessage = async () => {
  let message = ``;
  message += `Mohon maaf, fitur sedang dalam pengembangan.`;
  return message;
};

const complaintStatusMessage = async () => {
  let message = ``;
  message += `Mohon maaf, fitur sedang dalam pengembangan.`;
  return message;
};

const informationMessage = async () => {
  let message = ``;
  message += `Mohon maaf, saat ini informasi tentang gangguan pengaliran belum tersedia.`;
  return message;
};

const customerNotFoundMessage = async (customerNo) => {
  let message = ``;
  message += `Pelanggan dengan Nomor ${customerNo} tidak terdaftar. Mohon cek kembali nomor yang Anda kirimkan.`;
  return message;
};

const billNotFoundMessage = async (customerNo) => {
  let message = ``;
  message += `Tidak ada tagihan untuk Pelanggan dengan Nomor ${customerNo}.`;
  return message;
};

const historyNotFoundMessage = async (customerNo) => {
  let message = ``;
  message += `Tidak ada riwayat pembayaran di 5 bulan terakhir untuk Pelanggan dengan Nomor ${customerNo}.`;
  return message;
};

const keywordNotFoundMessage = async () => {
  let message = ``;
  message += `Mohon maaf, keyword yang Anda masukan tidak ada. Anda bisa memilih keyword yang ada di bawah dengan mengetikan angka.\n`;
  message += `1. Informasi Pelanggan\n`;
  message += `2. Informasi Tagihan\n`;
  message += `3. Riwayat Pembayaran\n`;
  message += `4. Pembayaran Tagihan\n`;
  message += `5. Pemasangan Baru\n`;
  message += `6. Pengaduan Pelanggan\n`;
  message += `7. Status Pengaduan\n`;
  message += `8. Informasi Gangguan\n`;
  message += `9. Kantor Pelayanan`;
  return message;
};

// --------------------------------------------------------
// End Message Template
// --------------------------------------------------------

// --------------------------------------------------------
// Begin Logging
// --------------------------------------------------------

const logReady = () => {
  console.log(`${APP_NAME} with client ${CLIENT_ID} is ready!`);
};

const logStartSession = (from) => {
  console.log(`Starting session from ${from}`);
};

const logSearching = (from, message) => {
  console.log(`Searching from ${from} with message ${message}`);
};

const logCustomerNotFound = (from, message) => {
  console.log(`Customer not found from ${from} with message ${message}}`);
};

const logBillNotFound = (from, message) => {
  console.log(`Bill not found from ${from} with message ${message}}`);
};

const logHistoryNotFound = (from, message) => {
  console.log(`History Payment not found from ${from} with message ${message}}`);
};

const logKeywordNotFound = (from, message) => {
  console.log(`Keyword not found from ${from} with message ${message}}`);
};

// --------------------------------------------------------
// End Logging
// --------------------------------------------------------

// --------------------------------------------------------
// Begin WhatsApp Service
// --------------------------------------------------------

client.once("ready", () => {
  logReady();
});

client.on("qr", (qr) => {
  QrCode.generate(qr, { small: true });
});

client.on("message", async (message) => {
  const session = await getSession(message.from);
  if (!session) {
    logStartSession(message.from);
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = await greetingMessage();
    await startSession(message.from);
    await sleep(3000);
    chat.clearState();
    client.sendMessage(message.from, reply);
  } else if (session && message.body == "1") {
    await updateContext(message.from, "customer");
    const chat = await message.getChat();
    chat.sendStateTyping();
    if (session["subject"]) {
      const customer = await getCustomer(session["subject"]);
      const reply = await customerMessage(customer);
      await sleep(5000);
      chat.clearState();
      client.sendMessage(message.from, reply);
      await sleep(2000);
      chat.sendStateTyping();
      await sleep(3000);
      const info = await askContextMessage();
      chat.clearState();
      client.sendMessage(message.from, info);
    } else {
      const reply = await askSubjectMessage();
      await sleep(2000);
      chat.clearState();
      client.sendMessage(message.from, reply);
    }
  } else if (session && message.body == "2") {
    await updateContext(message.from, "bill");
    const chat = await message.getChat();
    chat.sendStateTyping();
    if (session["subject"]) {
      const bills = await getBills(session["subject"]);
      if (bills.length > 0) {
        const reply = await billsMessage(session["subject"], bills);
        await sleep(5000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        await sleep(2000);
        chat.sendStateTyping();
        await sleep(3000);
        const info = await askContextMessage();
        chat.clearState();
        client.sendMessage(message.from, info);
      } else {
        const reply = await billNotFoundMessage(message.body);
        await sleep(3000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        await sleep(2000);
        chat.sendStateTyping();
        await sleep(3000);
        const info = await askContextMessage();
        chat.clearState();
        client.sendMessage(message.from, info);
      }
    } else {
      const reply = await askSubjectMessage();
      await sleep(2000);
      chat.clearState();
      client.sendMessage(message.from, reply);
    }
  } else if (session && message.body == "3") {
    await updateContext(message.from, "history");
    const chat = await message.getChat();
    chat.sendStateTyping();
    if (session["subject"]) {
      const histories = await getHistories(session["subject"]);
      if (histories.length > 0) {
        const reply = await historiesMessage(session["subject"], histories);
        await sleep(5000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        await sleep(2000);
        chat.sendStateTyping();
        await sleep(3000);
        const info = await askContextMessage();
        chat.clearState();
        client.sendMessage(message.from, info);
      } else {
        const reply = await historyNotFoundMessage(message.body);
        await sleep(3000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        await sleep(2000);
        chat.sendStateTyping();
        await sleep(3000);
        const info = await askContextMessage();
        chat.clearState();
        client.sendMessage(message.from, info);
      }
    } else {
      const reply = await askSubjectMessage();
      await sleep(2000);
      chat.clearState();
      client.sendMessage(message.from, reply);
    }
  } else if (session && message.body == "4") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = await paymentMessage();
    await startSession(message.from);
    await sleep(3000);
    chat.clearState();
    client.sendMessage(message.from, reply);
  } else if (session && message.body == "5") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = await registrationMessage();
    await startSession(message.from);
    await sleep(3000);
    chat.clearState();
    client.sendMessage(message.from, reply);
  } else if (session && message.body == "6") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = await complaintMessage();
    await startSession(message.from);
    await sleep(3000);
    chat.clearState();
    client.sendMessage(message.from, reply);
  } else if (session && message.body == "7") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = await complaintStatusMessage();
    await startSession(message.from);
    await sleep(3000);
    chat.clearState();
    client.sendMessage(message.from, reply);
  } else if (session && message.body == "8") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = await informationMessage();
    await startSession(message.from);
    await sleep(3000);
    chat.clearState();
    client.sendMessage(message.from, reply);
  } else if (session && message.body == "9") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = officeLocation;
    await sleep(3000);
    chat.clearState();
    client.sendMessage(message.from, reply);
  } else if (session && session["context"] == "customer") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const check = await checkCustomer(message.body);
    if (check) {
      await updateSubject(message.from, message.body);
      const customer = await getCustomer(message.body);
      const reply = await customerMessage(customer);
      await sleep(5000);
      chat.clearState();
      client.sendMessage(message.from, reply);
      await sleep(2000);
      chat.sendStateTyping();
      await sleep(3000);
      const info = await askContextMessage();
      chat.clearState();
      client.sendMessage(message.from, info);
    } else {
      const reply = await customerNotFoundMessage(message.body);
      await sleep(3000);
      chat.clearState();
      client.sendMessage(message.from, reply);
    }
  } else if (session && session["context"] == "bill") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const check = await checkCustomer(message.body);
    if (check) {
      await updateSubject(message.from, message.body);
      const bills = await getBills(message.body);
      if (bills.length > 0) {
        const reply = await billsMessage(message.body, bills);
        await sleep(5000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        await sleep(2000);
        chat.sendStateTyping();
        await sleep(3000);
        const info = await askContextMessage();
        chat.clearState();
        client.sendMessage(message.from, info);
      } else {
        const reply = await billNotFoundMessage(message.body);
        await sleep(3000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        await sleep(2000);
        chat.sendStateTyping();
        await sleep(3000);
        const info = await askContextMessage();
        chat.clearState();
        client.sendMessage(message.from, info);
      }
    } else {
      const reply = await customerNotFoundMessage(message.body);
      await sleep(3000);
      chat.clearState();
      client.sendMessage(message.from, reply);
    }
  } else if (session && session["context"] == "history") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const check = await checkCustomer(message.body);
    if (check) {
      await updateSubject(message.from, message.body);
      const histories = await getHistories(message.body);
      if (histories.length > 0) {
        const reply = await historiesMessage(message.body, histories);
        await sleep(5000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        await sleep(2000);
        chat.sendStateTyping();
        await sleep(3000);
        const info = await askContextMessage();
        chat.clearState();
        client.sendMessage(message.from, info);
      } else {
        const reply = await historyNotFoundMessage(message.body);
        await sleep(3000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        await sleep(2000);
        chat.sendStateTyping();
        await sleep(3000);
        const info = await askContextMessage();
        chat.clearState();
        client.sendMessage(message.from, info);
      }
    } else {
      const reply = await customerNotFoundMessage(message.body);
      await sleep(3000);
      chat.clearState();
      client.sendMessage(message.from, reply);
    }
  } else {
    logKeywordNotFound(message.from, message.body);
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = await keywordNotFoundMessage();
    await sleep(3000);
    chat.clearState();
    client.sendMessage(message.from, reply);
  }
});

client.initialize();

// --------------------------------------------------------
// End WhatsApp Service
// --------------------------------------------------------
