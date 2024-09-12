document.addEventListener('DOMContentLoaded', function() {
  
  accountbalance();

  document.getElementById("transaction-form").addEventListener("submit", function (event) {
      event.preventDefault();

      let flag = 1;
      const toAddress = sessionStorage.getItem('walletID');
      const amount = document.getElementById('amount').value;
      const secret = document.getElementById('secret').value;
      const message = document.getElementById('message').value;
      const fromAddress = null;

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
          fetch('/top-up', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ transaction, digitalsignature })
          })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  handleLoginsuccess("Top Up Successful");
                  alert('Top Up Successful!');
                  accountbalance();
              } else {
                  handleLoginError("Top Up Failed: " + data.message);
                  alert(`Top Up Failed: ${data.message}`);
              }
          })
          .catch(error => {
              handleLoginError("Top Up Failed: " + error.message);
              console.error('Top Up Failed: ', error);
          });
      }
  });

  // Handle logout
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

// Function to load account balance
function accountbalance() {
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

// Function to set error message
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

// Function to set success message
function setSuccessFor(input) {
  if (input) {
    const formControl = input.parentElement;
    formControl.className = "input-group success";
  } else {
    console.error("Input element not found for success message");
  }
}

// Function to handle login error
function handleLoginError(message) {
  const loginStatus = document.querySelector(".login-status");
  if (loginStatus) {
    loginStatus.innerText = message;
    loginStatus.className = "login-status error";
  } else {
    console.error("Login status element not found for error message");
  }
}

// Function to handle login success
function handleLoginsuccess(message) {
  const loginStatus = document.querySelector(".login-status");
  if (loginStatus) {
    loginStatus.innerText = message;
    loginStatus.className = "login-status success";
  } else {
    console.error("Login status element not found for success message");
  }
}

// Function to sign data
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
