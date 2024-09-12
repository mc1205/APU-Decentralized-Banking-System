const WebSocket = require('ws');
class P2P {
    constructor(transactionBlockchain, userBlockchain, port, initialPeers) {
        this.transactionBlockchain = transactionBlockchain;
        this.userBlockchain = userBlockchain;
        this.sockets = [];

        const server = new WebSocket.Server({ port });
        server.on('connection', (socket) => this.initConnection(socket));

        this.connectToPeers(initialPeers);
        console.log(`Listening websocket p2p port on: ${port}`);
    }

    connectToPeers(peers) {
        peers.forEach((peer) => {
            const socket = new WebSocket(peer);
            socket.on('open', () => this.initConnection(socket));
            socket.on('error', (err) => console.error(`Connection failed to peer: ${peer}`, err.message));
        });
    }

    initConnection(socket) {
        this.sockets.push(socket);
        socket.on('message', (data) => this.handleMessage(socket, data));
        socket.on('close', () => this.removeSocket(socket));
        socket.on('error', () => this.removeSocket(socket));
        this.requestFullChain(socket);
    }

    handleMessage(socket, data) {
        let message;
        try {
            message = JSON.parse(data);
        } catch (err) {
            console.error('Failed to parse message:', data);
            return;
        }
        const { type, data: blockData } = message;
        if (type === 'transactionNewBlock') {
            this.handleNewBlock(type,blockData);
        } else if (type === 'userNewBlock') {
            this.handleNewBlock(type,blockData);
        } else if (type === 'sendtransaction') {
            this.sendtransaction(blockData);
        } else if (type === 'minependingtransaction') {
            this.minependingtransaction(blockData);
        } else if (type === 'passwordupdate') {
            this.passwordupdate(blockData);
        } else if (type === 'fullTransactionChain') {
            this.replaceTransactionChain(blockData);
        } else if (type === 'fullUserChain') {
            this.replaceUserChain(blockData);
        } else if (type === 'requestFullChain') {
            this.sendFullChain(socket);
        }
    }

    passwordupdate(blockData){
        if(this.userBlockchain.Blockchainvalidation(blockData)){
            this.userBlockchain.chain = blockData;
        }
    }

    minependingtransaction(blockData){
        if (this.transactionBlockchain.validateNewBlock(blockData)){
            this.transactionBlockchain.pendingTransactions = [];
            this.transactionBlockchain.TransactionChain.push(blockData);
        }
    }

    sendtransaction(blockData){
        this.transactionBlockchain.pendingTransactions.push(blockData);
    }

    handleNewBlock(type,blockData){
        if (type === 'transactionNewBlock'){
            if (this.transactionBlockchain.validateNewBlock(blockData)){
                this.transactionBlockchain.TransactionChain.push(blockData);
            }
        }else if (type === 'userNewBlock'){
            if (this.userBlockchain.validateNewBlock(blockData)){
                this.userBlockchain.chain.push(blockData);
            }
        }
    }

    requestFullChain(socket) {
        socket.send(JSON.stringify({ type: 'requestFullChain' }));
    }

    sendFullChain(socket) {
        socket.send(JSON.stringify({
            type: 'fullTransactionChain',
            data: this.transactionBlockchain.TransactionChain
        }));
        socket.send(JSON.stringify({
            type: 'fullUserChain',
            data: this.userBlockchain.chain
        }));
    }

    replaceTransactionChain(newChain) {
        if (newChain.length > this.transactionBlockchain.TransactionChain.length && this.transactionBlockchain.Blockchainvalidation(newChain)) {
            this.transactionBlockchain.TransactionChain = newChain;
        }
    }

    replaceUserChain(newChain) {
        if (newChain.length > this.userBlockchain.chain.length && this.userBlockchain.Blockchainvalidation(newChain)) {
            this.userBlockchain.chain = newChain;
        }
    }

    broadcastNewBlock(type,newBlock) {
        this.sockets.forEach((socket) => {
            socket.send(JSON.stringify({ type, data: newBlock }));
        });
    }

    removeSocket(socket) {
        this.sockets.splice(this.sockets.indexOf(socket), 1);
        console.log('Connection closed');
    }
}

module.exports = P2P;
