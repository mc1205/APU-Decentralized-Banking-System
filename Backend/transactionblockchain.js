const crypto = require("crypto");
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

class Block {
    constructor(
      index,
      version,
      previousHash,
      timestamp,
      difficulty,
      transactions
    ) {
      this.blockID = ""; // Get From MineBlock Function
      this.index = index; // Get from transaction blockchain 
      this.version = version; // Get from transaction blockchain
      this.previousHash = previousHash; // Get from Transaction blockchain
      this.timestamp = timestamp; // Get from Transaction blockchain
      this.difficulty = difficulty; //Get from Transaction blockchain
      this.nonce = 0; // Get from MineBlock Function
      this.transactions = transactions; // Frontend -> Transaction Blockchain -> Block Class
      this.merkleRoot = this.computeMerkleRoot(this.transactions); // Calculate by Merkle Root Calculation
    }

    static fromObject(data) {
      const block = new Block(
          data.index,
          data.version,
          data.previousHash,
          data.timestamp,
          data.difficulty,
          data.transactions 
      );
      block.blockID = data.blockID;
      block.nonce = data.nonce;
      block.merkleRoot = data.merkleRoot;
      return block;
    }

    hashcalculator(data) {
        return crypto.createHash("sha256").update(data).digest("hex");
    }

    computeMerkleRoot(transactions) {
        if (transactions.length === 0) {
          return this.hashcalculator("");
        }
    
        let currentLevel = transactions.map((tx) =>
          this.hashcalculator(JSON.stringify(tx))
        );
    
        while (currentLevel.length > 1) {
          if (currentLevel.length % 2 !== 0) {
            currentLevel.push(currentLevel[currentLevel.length - 1]);
          }
    
          let nextLevel = [];
          for (let i = 0; i < currentLevel.length; i += 2) {
            nextLevel.push(
              this.hashcalculator(currentLevel[i] + currentLevel[i + 1])
            );
          }
    
          currentLevel = nextLevel;
        }
    
        return currentLevel[0];
    }

    mineBlock() {
        while (this.blockID.substring(0, this.difficulty) !== '0'.repeat(this.difficulty)) 
        {
          this.nonce++;
          this.blockID = this.hashcalculator(this.index +
            this.previousHash +
            this.timestamp +
            this.merkleRoot +
            this.nonce +
            this.version);
        }
    }

    hashvalidation() {
        return this.hashcalculator(this.index +
            this.previousHash +
            this.timestamp +
            this.merkleRoot +
            this.nonce +
            this.version);
    }
}

class TransactionBlockchain {
    constructor(userBlockchain) {
        this.userBlockchain = userBlockchain;
        this.difficulty = 4;
        this.version = "1.0";
        this.pendingTransactions = [];
        this.TransactionChain = [];
    }

    createGenesisBlock() {
        const genesisBlock = new Block(
          0,
          this.version,
          "0",
          Date.now(),
          this.difficulty,
          []
        );
        genesisBlock.mineBlock();
        return genesisBlock;
    }

    initialize() {
      if (this.TransactionChain.length === 0) {
        this.TransactionChain.push(this.createGenesisBlock());
      }
    }

    createTransaction(transaction, digitalSignature,p2p) {
        const senderBalance = this.getAccountBalance(transaction.fromAddress);

        if (parseFloat(senderBalance) < parseFloat(transaction.amount)) {
          return { success: false, message: "Insufficient balance" };
        }

        const receiverExists = this.userBlockchain.findUserByWalletID(transaction.toAddress);
        if (!receiverExists) {
          return { success: false, message: "Receiver wallet ID does not exist" };
        }

        if (!this.verifyTransaction(transaction, digitalSignature)) {
          return { success: false, message: "Invalid Transaction Secret" };
        }
        
        const successfulTransaction = {
            ...transaction,
            digitalSignature,
            status: 'pending',
            date: Date.now()
        };
        this.pendingTransactions.push(successfulTransaction);
        p2p.broadcastNewBlock("sendtransaction",successfulTransaction);

        if (this.pendingTransactions.length >= 3) {
            this.minePendingTransactions(p2p);
        }

        return { success: true, message: "Transaction created successfully" };
    }

    topup(transaction, digitalSignature,p2p) {
        if (!this.verifyTopupTransaction(transaction, digitalSignature)) {
            return { success: false, message: "Invalid Transaction Secret" };
        }

        const successfulTransaction = {
            ...transaction,
            digitalSignature,
            status: 'confirmed',
            date: Date.now()
        };
      
        this.mineTransactions(successfulTransaction,p2p);

        return { success: true, message: "Transaction created successfully" };
    }

    minePendingTransactions(p2p) {
        this.pendingTransactions.forEach(transaction => {
            transaction.status = "confirmed";
        });

        const newBlock = new Block(
          this.TransactionChain.length,
          this.version,
          this.getLatestBlock().blockID,
          Date.now(),
          this.difficulty,
          this.pendingTransactions
        );
    
        newBlock.mineBlock();
        if (this.validateNewBlock(newBlock)) {
            let oldblockchainlength = this.TransactionChain.length;
            this.TransactionChain.push(newBlock);
            this.pendingTransactions = [];
            p2p.broadcastNewBlock('minependingtransaction',newBlock);
            console.log("=======New Transaction Block==========");
            console.log(newBlock);
            console.log("======================================");
            console.log("=======Blockchian Updated Length==========");
            console.log("Before Blockchain Length: " + oldblockchainlength);
            console.log("After Blockchain Length: " + this.TransactionChain.length);
            console.log("==========================================");
        } else {
            console.error("Invalid block mined");
        }
    }

    mineTransactions(transaction,p2p) {
        const newBlock = new Block(
          this.TransactionChain.length,
          this.version,
          this.getLatestBlock().blockID,
          Date.now(),
          this.difficulty,
          [transaction]
        );
    
        newBlock.mineBlock();
        if (this.validateNewBlock(newBlock)) {
            let oldblockchainlength = this.TransactionChain.length;
            this.TransactionChain.push(newBlock);
            p2p.broadcastNewBlock("transactionNewBlock",newBlock);
            console.log("=======New Transaction Block==========");
            console.log(newBlock);
            console.log("======================================");
            console.log("=======Blockchian Updated Length==========");
            console.log("Before Blockchain Length: " + oldblockchainlength);
            console.log("After Blockchain Length: " + this.TransactionChain.length);
            console.log("==========================================");
        } else {
            console.error("Invalid block mined");
        }
    }

    getLatestBlock() {
        return this.TransactionChain[this.TransactionChain.length - 1];
    }

    getAccountBalance(walletID) {
        let balance = 0;
        const allTransactions = this.getAllTransactions();
        
        for (const transaction of allTransactions) {
          if (transaction.fromAddress === walletID) {
            balance -= parseFloat(transaction.amount);
          }
          if (transaction.toAddress === walletID) {
            balance += parseFloat(transaction.amount);
          }
        }

        for (const transaction of this.pendingTransactions) {
            if (transaction.fromAddress === walletID) {
              balance -= parseFloat(transaction.amount);
            }
        }
        return balance;
    }

    getAllTransactions() {
      const transactions = [];
      for (const block of this.TransactionChain) {
          for (const transaction of block.transactions) {
              const allTransaction = {
                  ...transaction,
                  blockID: block.blockID
              };
              transactions.push(allTransaction);
          }
      }
      return transactions;
    }

    getAccountHistory(walletID) {
        const accountHistory = [];
        const allTransactions = this.getAllTransactions();

        for (const successfulTransaction of allTransactions) {
            if (successfulTransaction.fromAddress === walletID || successfulTransaction.toAddress === walletID) {
              accountHistory.push(successfulTransaction);
            }
        }

        for (const transaction of this.pendingTransactions) {
            if (transaction.fromAddress === walletID) {
              const pendingTransaction = {
                ...transaction,
                blockID: null
              };
              accountHistory.push(pendingTransaction);
            }
        }
        return accountHistory;
    }

    verifyTransaction(transaction, digitalSignature) {
        const user = this.userBlockchain.findUserByWalletID(transaction.fromAddress);
        if (!user) {
          return false;
        }
        const keyPair = ec.keyFromPublic(user.publicKey, 'hex');
        const msgHash = crypto.createHash('sha256').update(JSON.stringify(transaction)).digest('hex');
        return keyPair.verify(msgHash, digitalSignature);
    }

    verifyTopupTransaction(transaction, digitalSignature) {
        const user = this.userBlockchain.findUserByWalletID(transaction.toAddress);
        if (!user) {
          return false;
        }
        const keyPair = ec.keyFromPublic(user.publicKey, 'hex');
        const msgHash = crypto.createHash('sha256').update(JSON.stringify(transaction)).digest('hex');
        return keyPair.verify(msgHash, digitalSignature);
    }

    validateBlockchain() {
        for (let i = 1; i < this.TransactionChain.length; i++) {
          const currentBlock = this.TransactionChain[i];
          const previousBlock = this.TransactionChain[i - 1];
          
          if (currentBlock.blockID !== currentBlock.hashvalidation()) {
            return false;
          }
    
          if (currentBlock.previousHash !== previousBlock.blockID) {
            return false;
          }
    
          if (currentBlock.timestamp < previousBlock.timestamp) {
            return false;
          }
        }
        return true;
    }

    validateNewBlock(newBlock) {
        if (newBlock.index !== this.TransactionChain.length) {
            return false;
        }
      
        if (newBlock.previousHash !== this.getLatestBlock().blockID) {
            return false;
        }

        const now = Date.now();
        if (newBlock.timestamp > now || now - newBlock.timestamp > 60000) {
            return false;
        }

        return true;
    }

    Blockchainvalidation(blockData) {
      for (let i = 1; i < blockData.length; i++) {
          let currentBlock = blockData[i]; 
          let previousBlock = blockData[i - 1];
  
          if (!(currentBlock instanceof Block)) {
              currentBlock = Block.fromObject(currentBlock);
          }
          if (!(previousBlock instanceof Block)) {
            previousBlock = Block.fromObject(previousBlock);
        }
  
  
          if (currentBlock.blockID !== currentBlock.hashvalidation()) {
              return false;
          }
  
          if (currentBlock.previousHash !== previousBlock.blockID) {
              return false;
          }
  
          if (currentBlock.timestamp < previousBlock.timestamp) {
              return false;
          }
      }
      return true;
  }

}

module.exports = { TransactionBlockchain};
