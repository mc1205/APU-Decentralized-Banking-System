const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');
const bcrypt = require('bcrypt');
const saltRounds = 10;

function hashPassword(password) {
    return bcrypt.hashSync(password, saltRounds);
}

function createWalletID() {
    return crypto.randomBytes(16).toString('hex');
}

function generateKeyPair() {
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');
    return {
        publicKey: publicKey,
        privateKey: privateKey
    };
}

class Userblock {
    constructor(
        index,
        version,
        previousHash,
        timestamp,
        difficulty,
        userData
    ) {
        this.blockID = ""; // Get From MineBlock Function
        this.index = index; // Get from transaction blockchain 
        this.version = version; // Get from transaction blockchain
        this.previousHash = previousHash; // Get from Transaction blockchain
        this.timestamp = timestamp; // Get from Transaction blockchain
        this.difficulty = difficulty; //Get from Transaction blockchain
        this.nonce = 0; // Get from MineBlock Function
        this.userData = userData; // Frontend -> Transaction Blockchain -> Block Class
        this.merkleRoot = this.computeMerkleRoot(this.userData); // Calculate by Merkle Root Calculation
    }

    static fromObject(data) {
        const block = new Userblock(
            data.index,
            data.version,
            data.previousHash,
            data.timestamp,
            data.difficulty,
            data.userData 
        );
        block.blockID = data.blockID;
        block.nonce = data.nonce;
        block.merkleRoot = data.merkleRoot;
        return block;
      }

    hashcalculator(data) {
        return crypto.createHash("sha256").update(data).digest("hex");
    }

    computeMerkleRoot(userData) {
        if (userData.length === 0) {
          return this.hashcalculator("");
        }
    
        let currentLevel = userData.map((tx) =>
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

class Userblockchain {
    constructor() {
        this.difficulty = 4;
        this.version = '1.0';
        this.chain = [];
    }

    createGenesisBlock() {
        const genesisBlock = new Userblock(
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
        if (this.chain.length === 0) {
            this.chain.push(this.createGenesisBlock());
        }
    }

    addUser(userData,p2p) {
        const { publicKey, privateKey } = generateKeyPair();
        const walletID = createWalletID();
        const newUser = {
            ...userData,
            password: hashPassword(userData.password),
            walletID: walletID,
            publicKey: publicKey,
        };
        let newBlock = new Userblock(
            this.chain.length,
            this.version,
            this.getLatestBlock().blockID,
            Date.now(),
            this.difficulty,
            [newUser]
        );
        newBlock.mineBlock();
        if (this.validateNewBlock(newBlock)) {
            let oldblockchainlength = this.chain.length
            this.chain.push(newBlock);
            p2p.broadcastNewBlock("userNewBlock",newBlock);
            console.log("=======New User Block==========");
            console.log(newBlock);
            console.log("===============================");
            console.log("=======Blockchian Updated Length==========");
            console.log("Before Blockchain Length: " + oldblockchainlength);
            console.log("After Blockchain Length: " + this.chain.length);
            console.log("==========================================");
            return { walletID, privateKey };
        } else {
            throw new Error('New block validation failed');
        }
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    findUserByWalletID(walletID) {
        for (const block of this.chain) {
            for (const user of block.userData) {
                if (user.walletID === walletID) {
                    return user;
                }
            }
        }
        return null;
    }
    

    authenticateUserByWalletID(walletID, password) {
        for (const block of this.chain) {
            for (const user of block.userData) {
                if (user.walletID === walletID && bcrypt.compareSync(password, user.password)) {
                    return user;
                }
            }
        }
        console.log("Authentication failed");
        return null;
    }

    settingpasswordchange(currentpassword, newpassword, walletID, p2p) {
        for (let i = 0; i < this.chain.length; i++) {
            let block = this.chain[i];
            if (!(block instanceof Userblock)) {
                block = Userblock.fromObject(block);
            }
            for (let j = 0; j < block.userData.length; j++) {
                const user = block.userData[j];
                if (user.walletID === walletID) {
                    if (bcrypt.compareSync(currentpassword, user.password)) {
                        user.password = hashPassword(newpassword);
                        block.userData[j] = user;
                        block.timestamp = Date.now();
                        block.merkleRoot = block.computeMerkleRoot(block.userData);
                        block.blockID = '';
                        block.mineBlock();
                        for (let k = i + 1; k < this.chain.length; k++) {
                            if (!(this.chain[k] instanceof Userblock)) {
                                this.chain[k] = Userblock.fromObject(this.chain[k]);
                            }
                            this.chain[k].previousHash = this.chain[k - 1].blockID;
                            this.chain[k].timestamp = Date.now();
                            this.chain[k].blockID = '';
                            this.chain[k].mineBlock();
                        }
                        if (!this.validateBlockchain()) {
                            return { success: false, message: "Blockchain Invalid Update" };
                        }
                        p2p.broadcastNewBlock("passwordupdate", this.chain);
                        return { success: true, message: "Password Update Successful" };
                    } else {
                        return { success: false, message: "Current Password Unmatched" };
                    }
                }
            }
        }
        return { success: false, message: "System Failed" };
    }
    

    forgetpassword(updateuserdata, digitalsignature, p2p) {
        let walletIDFound = false;
        for (let i = 0; i < this.chain.length; i++) {
            let block = this.chain[i];
            if (!(block instanceof Userblock)) {
                block = Userblock.fromObject(block);
            }
            for (let j = 0; j < block.userData.length; j++) {
                const user = block.userData[j];
                if (user.walletID === updateuserdata.walletID) {
                    walletIDFound = true;
                    if (!this.verifyforgetpassword(user.publicKey, digitalsignature, updateuserdata)) {
                        return { success: false, message: "Secret Incorrect" };
                    } 
                    user.password = hashPassword(updateuserdata.hashnewpassword);
                    block.userData[j] = user;
                    block.timestamp = Date.now();
                    block.merkleRoot = block.computeMerkleRoot(block.userData);
                    block.blockID = '';
                    block.mineBlock();
                    for (let k = i + 1; k < this.chain.length; k++) {
                        if (!(this.chain[k] instanceof Userblock)) {
                            this.chain[k] = Userblock.fromObject(this.chain[k]);
                        }
                        this.chain[k].previousHash = this.chain[k - 1].blockID;
                        this.chain[k].timestamp = Date.now();
                        this.chain[k].blockID = '';
                        this.chain[k].mineBlock();
                    }
                    if (!this.validateBlockchain()) {
                        return { success: false, message: "Blockchain Invalid Update" };
                    }
                    p2p.broadcastNewBlock("passwordupdate", this.chain);
                    return { success: true, message: "Password Update Succesful" };
                }
            }
        }
        if (!walletIDFound) {
            return { success: false, message: "Invalid Wallet ID" };
        }
    }

    verifyforgetpassword(publickey,digitalsignature,updateuserdata) {
        const keyPair = ec.keyFromPublic(publickey, 'hex');
        const msgHash = crypto.createHash('sha256').update(JSON.stringify(updateuserdata)).digest('hex');  
        return keyPair.verify(msgHash, digitalsignature);
    }

    validateNewBlock(newBlock) {
        if (newBlock.index !== this.chain.length) {
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

    validateBlockchain() {
        for (let i = 1; i < this.chain.length; i++) {
            let currentBlock = this.chain[i];
            let previousBlock = this.chain[i - 1];

            if (!(currentBlock instanceof Userblock)) {
                currentBlock = Userblock.fromObject(currentBlock);
            }
            if (!(previousBlock instanceof Userblock)) {
                previousBlock = Userblock.fromObject(previousBlock);
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

    Blockchainvalidation(blockData) {
        for (let i = 1; i < blockData.length; i++) {
            let currentBlock = blockData[i];
            let previousBlock = blockData[i - 1];

            if (!(currentBlock instanceof Userblock)) {
                currentBlock = Userblock.fromObject(currentBlock);
            }
            if (!(previousBlock instanceof Userblock)) {
                previousBlock = Userblock.fromObject(previousBlock);
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

module.exports = { Userblockchain };
