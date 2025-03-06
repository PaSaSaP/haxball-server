import express from 'express';
import path from 'path';
import verifyRouter from './verify_page';
import mainRouter from './main';
import apiGetServers from './api_get_servers';
import apiTop10 from './api_top10';


const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));
// app.use('/', mainRouter);
app.use('/verify', verifyRouter);

// API zwracające listę serwerów
app.use("/api/servers", apiGetServers);

app.use("/api/top10", apiTop10);

// Serwowanie statycznych plików Reacta
app.use(express.static(path.join(__dirname, "../../../www_frontend/build")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../../www_frontend/build/index.html"));
});
// TODO fix that long ../.. paths, somewhere is big misunderstanding...

app.listen(port, () => {
    console.log(`Serwer działa na http://localhost:${port}`);
});
