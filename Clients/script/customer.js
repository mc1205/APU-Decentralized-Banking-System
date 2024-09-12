document.addEventListener('DOMContentLoaded', function() {
    
    accountbalance();
    blockchainlatest();
    accounthistory();

    document.getElementById("transaction-form").addEventListener("submit", function (event) {
        event.preventDefault();
        let flag = 1;
        const toAddress = document.getElementById('address').value;
        const amount = document.getElementById('amount').value;
        const secret = document.getElementById('secret').value;
        const message = document.getElementById('message').value;
        const fromAddress = sessionStorage.getItem('walletID');
        if (toAddress === "") {
            setErrorFor(document.getElementById("address"), "Address To cannot be blank");
            flag = 0;
        } else if (fromAddress === toAddress){
            setErrorFor(document.getElementById("address"),"Address To cannot be your own Wallet ID");
            flag = 0;
        }else {
            setSuccessFor(document.getElementById("address"));
        }
        if (amount === "") {
            setErrorFor(document.getElementById("amount"), "Amount cannot be blank");
            flag = 0;
        } else if (isNaN(amount)) {
            setErrorFor(document.getElementById("amount"), "Amount must be a number");
            flag = 0;
        } else if (parseFloat(amount) === 0) {
            setErrorFor(document.getElementById("amount"), "Amount can't be 0");
            flag = 0;
        } else {
            setSuccessFor(document.getElementById("amount"));
        }

        if (secret === "") {
            setErrorFor(document.getElementById("secret"), "Secret cannot be blank");
            flag = 0;
        } else {
            setSuccessFor(document.getElementById("secret"));
        }
        if (message === "") {
            setErrorFor(document.getElementById("message"), "Message cannot be blank");
            flag = 0;
        } else if (message.length >= 60) {
            setErrorFor(document.getElementById("message"), "Message is too long, Please reduce it to less than 60 characters");
            flag = 0;
        } else {
            setSuccessFor(document.getElementById("message"));
        }

        if (flag === 1) {
            const transaction = {
                fromAddress,
                toAddress,
                amount: parseFloat(amount).toFixed(2),
                message
            };
            const digitalsignature = signData(transaction, secret);
            fetch('/send-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ transaction, digitalsignature })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    handleLoginsuccess("Transaction Successful");
                    alert('Transaction successful!');
                    blockchainlatest();
                    accountbalance();
                    accounthistory();
                } else {
                    handleLoginError("Transaction failed: " + data.message);
                    alert(`Transaction failed: ${data.message}`);
                }
            })
            .catch(error => {
                handleLoginError("Transaction failed: " + error.message);
                console.error('Error sending transaction:', error);
            });
        }
    });

    document.getElementById('logout-button').addEventListener('click', function(event) {
        event.preventDefault();

        fetch('/logout', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => {
            console.log('Logout response status:', response.status); // Log the response status
            if (response.ok) {
                alert("Your Account Logged Out");
                sessionStorage.clear();
                window.location.href = '/Clients/index.html';
            } else {
                alert("Logout failed. Please try again.");
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
            alert("An error occurred. Please try again.");
        });

    });
});

function accountbalance(){
    const walletID = sessionStorage.getItem('walletID');
    const username = sessionStorage.getItem('username');
    document.getElementById('account-username').innerText = `Username: ${username}`;
    document.getElementById('account-walletID').innerText = `Wallet ID: ${walletID}`;
    fetch(`/account-details/${walletID}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          let printbalance = parseFloat(data.balance).toFixed(2);  
          document.getElementById('account-balance').innerText = `RM ${printbalance}`;
        } else {
          alert('Failed to load account details');
        }
      })
      .catch(error => {
        console.error('Error fetching account details:', error);
      });
}

function blockchainlatest(){
    fetch('/latest-transactions')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const transactionsTableBody = document.querySelector('#latest-transactions-table tbody');
                transactionsTableBody.innerHTML = '';
                data.transactions.forEach(transaction => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${new Date(transaction.date).toLocaleString()}</td>
                        <td>${transaction.fromAddress}</td>
                        <td>${transaction.toAddress}</td>
                        <td>${transaction.amount}</td>
                        <td class="block-hash">${transaction.blockID}</td>
                    `;
                    transactionsTableBody.appendChild(row);
                });
            } else {
                alert('Failed to load latest transactions');
            }
        })
        .catch(error => {
            console.error('Error fetching latest transactions:', error);
        });
}

function accounthistory(){
    const walletID = sessionStorage.getItem('walletID');
    fetch(`/account-history/${walletID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const historyTableBody = document.querySelector('#account-history-table tbody');
                historyTableBody.innerHTML = '';
                data.history.forEach(transaction => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${new Date(transaction.date).toLocaleString()}</td>
                        <td>${transaction.fromAddress}</td>
                        <td>${transaction.toAddress}</td>
                        <td>${transaction.amount}</td>
                        <td class="block-hash">${transaction.message}</td>
                        <td>${transaction.status}</td>
                        <td class="block-hash">${transaction.blockID}</td>
                    `;
                    historyTableBody.appendChild(row);
                });
            } else {
                alert('Failed to load account history');
            }
        })
        .catch(error => {
            console.error('Error fetching account history:', error);
        });
}


function setErrorFor(input, message) {
    if (input) {
      const formControl = input.parentElement;
      const small = formControl.querySelector("small");
      small.innerText = message;
      formControl.className = "input-group error";
    } else {
      console.error("Input element not found for error message");
    }
}

function setSuccessFor(input) {
    if (input) {
      const formControl = input.parentElement;
      formControl.className = "input-group success";
    } else {
      console.error("Input element not found for success message");
    }
}

function handleLoginError(message) {
    const loginStatus = document.querySelector(".login-status");
    if (loginStatus) {
      loginStatus.innerText = message;
      loginStatus.className = "login-status error";
    } else {
      console.error("Login status element not found for error message");
    }
}

function handleLoginsuccess(message) {
    const loginStatus = document.querySelector(".login-status");
    if (loginStatus) {
      loginStatus.innerText = message;
      loginStatus.className = "login-status success";
    } else {
      console.error("Login status element not found for success message");
    }
}

function signData(data, privateKey) {
    const EC = elliptic.ec;
    const ec = new EC('secp256k1');
    const keyPair = ec.keyFromPrivate(privateKey, 'hex');
    const msgHash = CryptoJS.SHA256(JSON.stringify(data)).toString(CryptoJS.enc.Hex);  // Hash the data using crypto-js
    const signature = keyPair.sign(msgHash);
    return {
        r: signature.r.toString('hex'),
        s: signature.s.toString('hex')
    };
}
