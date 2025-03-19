import express from 'express';
import path from 'path';
import verifyRouter from './api/verify_page';
import apiGetServers from './api/get_servers';
import apiTop10 from './api/top10';
import apiStripeTransaction from './api/stripe_transaction';
import apiPrivateGetPlayers from './api/private/get_player_names';
import apiPrivateGetMatches from './api/private/get_matches';
import apiPrivateGetMatchStats from './api/private/get_match_stats';
import apiGetMatchAggStats from './api/get_agg_match_stats';
import apiGetPlayerAggStats from './api/get_agg_player_stats';
import apiGetHallOfFame from './api/get_hall_of_fame';
import apiGetServersTimeline from './api/get_servers_timeline';
import stripeRedirect from './api/stripe_redirect';
import apiLogin from './api/login';
import apiSaveToken from './api/save_token';

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/verify', verifyRouter);

// API zwracające listę serwerów
app.use("/api/servers", apiGetServers);

app.use("/api/top10", apiTop10);
app.use("/api/top", apiTop10);

app.use("/api/stripe", apiStripeTransaction);
app.use("/stripe", stripeRedirect);

app.use("/api/private/player_names", apiPrivateGetPlayers);
app.use("/api/private/matches", apiPrivateGetMatches);
app.use("/api/private/match_stats", apiPrivateGetMatchStats);
app.use("/api/agg_stats", apiGetMatchAggStats); // TODO remove
app.use("/api/match_agg_stats", apiGetMatchAggStats);
app.use("/api/player_agg_stats", apiGetPlayerAggStats);
app.use("/api/hall_of_fame", apiGetHallOfFame);
app.use("/api/servers_timeline", apiGetServersTimeline);

app.use("/api/login", apiLogin);
app.use("/api/save_token", apiSaveToken);

// Serwowanie statycznych plików Reacta
app.use(express.static(path.join(__dirname, "../../../www_frontend/build")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../../www_frontend/build/index.html"));
});
// TODO fix that long ../.. paths, somewhere is big misunderstanding...

app.listen(port, () => {
    console.log(`Serwer działa na http://localhost:${port}`);
});
