// --------------------------------------------------------
// Begin Initialize
// --------------------------------------------------------

require('dotenv').config();

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const mysql = require("mysql2/promise");

const APP_NAME = process.env.APP_NAME;
const CLIENT_ID = process.env.CLIENT_ID;

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

// --------------------------------------------------------
// End Initialize
// --------------------------------------------------------



// --------------------------------------------------------
// Begin Database Service
// --------------------------------------------------------

const connection = async () => {
    return await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    });
};

const startSession = async (from) => {
    const db = await connection();
    await db.execute("INSERT INTO `wa_sessions` (`from`, `expired_at`) VALUES (?, UNIX_TIMESTAMP() + (60 * 15))", [from]);
    await db.end();
};

const updateSession = async (from) => {
    const db = await connection();
    await db.execute("UPDATE `wa_sessions` SET `expired_at` = UNIX_TIMESTAMP() + (60 * 15) WHERE `from` = ? AND `expired_at` > UNIX_TIMESTAMP()", [from]);
    await db.end();
};

const updateSubject = async (from, subject) => {
    const db = await connection();
    await db.execute("UPDATE `wa_sessions` SET `subject` = ? WHERE `from` = ? AND `expired_at` > UNIX_TIMESTAMP()", [subject, from]);
    await db.end();
};

const getSession = async (from) => {
    const db = await connection();
    const [rows] = await db.query("SELECT `id`, `context`, `subject` FROM `wa_sessions` WHERE `from` = ? AND `expired_at` > UNIX_TIMESTAMP() ORDER BY `expired_at` DESC LIMIT 1", [from]);
    await db.end();
    return rows[0] || false;
};

const getCustomer = async (id) => {
    const db = await connection();
    const [rows] = await db.query("SELECT `a`.`pel_no`, `a`.`pel_nama`, `a`.`pel_alamat`, `e`.`kel_ket`, `f`.`kec_ket`, `a`.`dkd_kd`, `c`.`gol_ket`, `d`.`um_ukuran`, `b`.`kps_ket` FROM `tm_pelanggan` `a` JOIN `tr_kondisi_ps` `b` ON `b`.`kps_kode` = `a`.`kps_kode` JOIN `tr_gol` `c` ON `c`.`gol_kode` = `a`.`gol_kode` JOIN `tr_ukuranmeter` `d` ON `d`.`um_kode` = `a`.`um_kode` JOIN `tr_kelurahan` `e` ON `e`.`kel_kode` = `a`.`kel_kode` JOIN `tr_kecamatan` `f` ON `f`.`kec_kode` = `e`.`kec_kode` WHERE `a`.`pel_no` = ?", [id]);
    await db.end();
    return rows[0] || false;
};

const getBills = async (id) => {
    const db = await connection();
    const [rows] = await db.query("SELECT `rek_thn`, `rek_bln`, `rek_stankini` - `rek_stanlalu` AS `rek_pakai`, `rek_uangair`, `rek_adm` + `rek_meter` AS `rek_beban`, `getDenda`(`rek_total`, `rek_bln`, `rek_thn`, `rek_gol`) AS `rek_denda`, `getDenda`(`rek_total`, `rek_bln`, `rek_thn`, `rek_gol`) + `rek_total` AS `rek_total` FROM `tm_rekening` WHERE `rek_sts` = 1 AND `rek_byr_sts` = 0 AND `pel_no` = ?", [id]);
    await db.end();
    return rows || false;
};

const getHistories = async (id) => {
    const db = await connection();
    const [rows] = await db.query("SELECT `a`.`rek_thn`, `a`.`rek_bln`, `a`.`rek_stankini` - `a`.`rek_stanlalu` AS `rek_pakai`, `b`.`byr_total`, `c`.`kar_nama`, DATE_FORMAT(`b`.`byr_tgl`, '%e') AS `byr_tgl`, DATE_FORMAT(`b`.`byr_tgl`, '%c') AS `byr_bln`, DATE_FORMAT(`b`.`byr_tgl`, '%Y') AS `byr_thn` FROM `tm_rekening` `a` JOIN `tm_pembayaran` `b` ON `b`.`rek_nomor` = `a`.`rek_nomor` AND `b`.`byr_sts` > 0 JOIN `tm_karyawan` `c` ON `c`.`kar_id` = `b`.`kar_id` WHERE `a`.`rek_sts` = 1 AND `a`.`pel_no` = ? ORDER BY `a`.`rek_nomor` DESC LIMIT 5", [id]);
    await db.end();
    return rows || false;
};

const getInformation = async () => {

};

const storeComplaint = async () => {

};

const getComplaint = async (id) => {

};

// --------------------------------------------------------
// End Database Service
// --------------------------------------------------------



// --------------------------------------------------------
// Begin Helpers
// --------------------------------------------------------

const monthFormatter = (value) => {
    const month = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

// --------------------------------------------------------
// End Helpers
// --------------------------------------------------------



// --------------------------------------------------------
// Begin Message Template
// --------------------------------------------------------

const greetingMessage = async () => {
    let message = ``;
    message += `Halo`;
    return message;
}

const askSubjectMessage = async () => {
    let message = ``;
    message += `Berapa nomor pelanggan Anda?`;
    return message;
}

const customerMessage = async (customer) => {
    let message = ``;
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
}

const billsMessage = async (bills) => {
    let message = ``;
    let billTotal = 0;
    for (let bill of bills) {
        message += `Periode ${monthFormatter(bill.rek_bln)} ${bill.rek_thn}\n`;
        message += `Pemakaian Air : ${bill.rek_pakai} m3\n`;
        message += `Uang Air : ${rupiahFormatter(bill.rek_uangair)}\n`;
        message += `Beban Tetap : ${rupiahFormatter(bill.rek_beban)}\n`;
        message += `Denda : ${rupiahFormatter(bill.rek_denda)}\n`;
        message += `Total : ${rupiahFormatter(bill.rek_total)}\n`;
        message += `\n`;
        billTotal += bill.rek_total;
    }
    message += `Total Tagihan : ${rupiahFormatter(billTotal)}`;
    return message;
}

const historiesMessage = async (histories) => {
    let message = ``;
    let i = 0;
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
}

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
}

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
    qrcode.generate(qr, { small: true });
});

client.on("message", async (message) => {
    const session = await getSession(message.from);
    if (!session) {
        const chat = await message.getChat();
        chat.sendStateTyping();
        const reply = await greetingMessage();
        await startSession(message.from);
        await sleep(3000);
        chat.clearState();
        client.sendMessage(message.from, reply);
        logStartSession(message.from);
    }
    else if (session && message.body == "1") {
        const chat = await message.getChat();
        chat.sendStateTyping();
        const customer = await getCustomer("100006");
        const reply = await customerMessage(customer);
        await sleep(5000);
        chat.clearState();
        client.sendMessage(message.from, reply);
    }
    else if (session && message.body == "2") {
        const chat = await message.getChat();
        chat.sendStateTyping();
        const bills = await getBills("100006");
        const reply = await billsMessage(bills);
        await sleep(5000);
        chat.clearState();
        client.sendMessage(message.from, reply);
    }
    else if (session && message.body == "3") {
        const chat = await message.getChat();
        chat.sendStateTyping();
        const histories = await getHistories("100006");
        const reply = await historiesMessage(histories);
        await sleep(5000);
        chat.clearState();
        client.sendMessage(message.from, reply);
    }
    else if (session && message.body == "4") {
        // BAYAR TAGIHAN
        // ---------------------------------
        // Jika belum ada API untuk pembayaran,
        // bisa menginformasikan pembayaran
        // tagihan bisa dilakukan di mana saja
    }
    else if (session && message.body == "5") {
        // pengaduan
    }
    else if (session && message.body == "6") {
        // cek status pengaduan
    }
    else if (session && message.body == "7") {
        // informasi gangguan pengaliran
    }
    else if (session && message.body.toLowerCase().startsWith("tagihan#")) {
        const chat = await message.getChat();
        chat.sendStateTyping();

        await sleep(1000);
        chat.clearState();
        client.sendMessage(message.from, "Saya akan melakukan pencarian, mohon tunggu...");
        console.log(`Searching from ${message.from} with message ${message.body}`);

        await sleep(1000);
        chat.sendStateTyping();

        const id = message.body.split("#")[1];
        const customer = await getCustomer(id);
        const bills = await getBills(id);

        let reply = "";
        let delay = 3000;

        if (customer) {
            reply += `Nomor: ${customer.pel_no}\n`;
            reply += `Nama Lengkap: ${customer.pel_nama}\n`;
            reply += `Alamat: ${customer.pel_alamat}\n`;
            reply += `Status: ${customer.kps_ket}\n`;
            reply += `\n`;
            reply += `*Rincian Tagihan:*\n`;

            if (bills.length > 0) {
                let i = 0;
                let grandTotal = 0;

                if (bills.length > 1) reply += `\n`;

                for (let bill of bills) {
                    if (i > 0) reply += `\n`;
                    reply += `Periode ${monthFormatter(bill.rek_bln)} ${bill.rek_thn}\n`;
                    reply += `Pemakaian: ${bill.rek_pakai} m3\n`;
                    reply += `Uang Air: ${rupiahFormatter(bill.rek_uangair)}\n`;
                    reply += `Beban Tetap: ${rupiahFormatter(bill.rek_beban)}\n`;
                    reply += `Denda: ${rupiahFormatter(bill.rek_denda)}\n`;
                    reply += `Total: ${rupiahFormatter(bill.rek_total)}\n`;
                    grandTotal += bill.rek_total;
                    i++;
                }

                reply += `\n`;
                reply += `*Total Tagihan: ${rupiahFormatter(grandTotal)}*`;
                delay = 6000;

                console.log(`Bill found from ${message.from} with message ${message.body}`);
            } else {
                reply += `Tidak ada tagihan`;
                console.log(`Bill not found from ${message.from} with message ${message.body}`);
            }
        } else {
            reply += `Mohon maaf, saya tidak dapat menemukan data tagihan dengan nomor pelanggan ${id}.`;
            console.log(`Customer not found from ${message.from} with message ${message.body}`);
        }

        await sleep(delay);
        chat.clearState();
        client.sendMessage(message.from, reply);
    }
    else {
        const chat = await message.getChat();
        chat.sendStateTyping();

        let reply = "Mohon maaf, saya tidak mengerti keyword tersebut. Untuk cek tagihan, Anda bisa menggunakan keyword Tagihan#NomorPelanggan.\n\n";
        reply += "Contoh :\n";
        reply += "Tagihan#12345678";

        await sleep(3000);
        chat.clearState();
        client.sendMessage(message.from, reply);

        console.log(`Keyword not found from ${message.from} with message ${message.body}`);
    }
});

client.initialize();

// --------------------------------------------------------
// End WhatsApp Service
// --------------------------------------------------------
