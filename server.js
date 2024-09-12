const crypto = require('crypto');
const express = require("express");
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bodyParser = require("body-parser");
const path = require("path");
const https = require('https');
const fs = require('fs');
const P2P = require("./Backend/p2p");
const { Userblockchain } = require('./Backend/userblockchain');
const { TransactionBlockchain } = require("./Backend/transactionblockchain");

const app = express();
const localIP = "127.0.0.1";
//Node 1
const port = 3000;
const p2pport = 6000;
const cookies = 'session_id_3000';
const peers = ['ws://127.0.0.1:6001','ws://127.0.0.1:6002'];
//Node 2
// const port = 3001;
// const p2pport = 6001;
// const cookies = 'session_id_3001';
// const peers = ['ws://127.0.0.1:6000','ws://127.0.0.1:6002'];
//Node 3
// const port = 3002;
// const p2pport = 6002;
// const cookies = 'session_id_3002';
// const peers = ['ws://127.0.0.1:6000','ws://127.0.0.1:6001'];
const secret = crypto.randomBytes(64).toString('hex');

const userBlockchain = new Userblockchain();
const transactionblockchain = new TransactionBlockchain(userBlockchain);
const p2p = new P2P(transactionblockchain, userBlockchain, p2pport, peers);

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,  
    max: 5000, 
    message: 'Too many requests from this IP, please try again after 5 minutes'
});
app.use(limiter);

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5, 
    message: 'Too many times attempts, please try again after 5 minutes'
});

const loginLimiter1 = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5, 
    message: 'Too many times attempts, please try again after 5 minutes'
});

const loginLimiter2 = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5, 
    message: 'Too many times attempts, please try again after 5 minutes'
});


app.use(session({
    name: cookies, 
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, path: '/', httpOnly: true } 
}));

function checkLogin(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.clearCookie(cookies);
        res.redirect('/Clients/login.html');
    }
}
app.use('/customer', checkLogin, express.static(path.join(__dirname, 'Customer')));

function restrictScriptsAccess(req, res, next) {
    const referer = req.get('referer');
    if ((req.url.startsWith('/Clients/script/') || 
        req.url.startsWith('/script/') || req.url.startsWith('/css/')|| 
        req.url.startsWith('/Images/')|| req.url.startsWith('/Clients/css/')|| 
        req.url.startsWith('/Clients/Images/')) && (!referer || !referer.startsWith('https://www.decentrabank.com'))) {
        return res.status(403).send('Access denied');
    }
    next();
}


app.use(restrictScriptsAccess);
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "Clients")));
app.use('/Clients',express.static(path.join(__dirname, "Clients")));




const sslServer = https.createServer(
    {
        key: fs.readFileSync(path.join(__dirname, 'Certificate', 'cert-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'Certificate', 'fullchain.pem'))
    },
    app
)

sslServer.listen(port, localIP, () => {
    console.log(`Server running at https://www.decentrabank.com:${port}`);
    setTimeout(() => {
        if (transactionblockchain.TransactionChain.length === 0) {
            transactionblockchain.initialize();
        }
        if (userBlockchain.chain.length === 0) {
            userBlockchain.initialize();
        }
        console.log(transactionblockchain.TransactionChain);
        console.log(userBlockchain.chain);
    }, 500); // Delay to ensure peers have time to respond
});

// Register a new user
app.post('/register', (req, res) => {
    const { name, username, password, email } = req.body;
    try {
        const { walletID, privateKey } = userBlockchain.addUser({ name, username, password, email },p2p);
        res.json({
            success: true,
            message: 'User registered successfully',
            walletID: walletID,
            privateKey: privateKey
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

// Login a user
app.post('/login', loginLimiter, (req, res) => {
    const { walletID, hashnewpassword } = req.body;
    const user = userBlockchain.authenticateUserByWalletID(walletID, hashnewpassword);
    if (user) {
        req.session.loggedIn = true;
        res.json({ success: true, message: 'Login successful', user });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

//logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie(cookies, { path: '/' });
        res.redirect('/Clients/index.html');
    });
});

// Get latest transactions
app.get('/latest-transactions', (req, res) => {
    const latestTransactions = transactionblockchain.getAllTransactions();
    res.json({
        success: true,
        transactions: latestTransactions
    });
});

// Get account history by wallet ID
app.get('/account-history/:walletID', (req, res) => {
    const { walletID } = req.params;
    const accountHistory = transactionblockchain.getAccountHistory(walletID);
    res.json({
        success: true,
        history: accountHistory
    });
});

// Get account details (balance) by wallet ID
app.get('/account-details/:walletID', (req, res) => {
    const { walletID } = req.params;
    const balance = transactionblockchain.getAccountBalance(walletID);
    res.json({
        success: true,
        balance: balance
    });
});

// Send a transaction
app.post('/send-transaction', (req, res) => {
    const { transaction, digitalsignature } = req.body;
    try {
        const result = transactionblockchain.createTransaction(transaction, digitalsignature,p2p);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Error processing transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Top-up an account
app.post('/top-up', (req, res) => {
    const { transaction, digitalsignature } = req.body;
    try {
        const result = transactionblockchain.topup(transaction, digitalsignature,p2p);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Error processing top-up:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Forget password
app.post('/forgetpassword',loginLimiter1, (req, res) => {
    const { userdata, digitalsignature } = req.body;
    const updated = userBlockchain.forgetpassword(userdata, digitalsignature,p2p);
    if (updated.success) {
        res.json(updated);
    } else {
        res.status(400).json(updated);
    }
});

// Change password
app.post('/setting-change-password',loginLimiter2, (req, res) => {
    const { currentpassword, newpassword, walletID } = req.body;
    try {
        const updated = userBlockchain.settingpasswordchange(currentpassword, newpassword, walletID, p2p);
        if (updated.success) {
            res.json(updated);
        } else {
            res.status(400).json(updated);
        }
    } catch (error) {
        console.error('Error during setting change password:', error);
        res.status(500).json({ success: false, message: 'Setting change password failed', error: error.message });
    }
});
