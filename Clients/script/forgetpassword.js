document.getElementById("forget-password-form").addEventListener("submit", function(event) {
    event.preventDefault();

    let flag = 1;
    const walletID = document.getElementById("walletID").value.trim();
    const newPassword = document.getElementById("new-password").value.trim();
    const confirmpassword = document.getElementById("confirm-password").value.trim();
    const secret = document.getElementById("secret").value.trim();
  
    if (walletID === "") {
      setErrorFor(document.getElementById("walletID"), "Username cannot be blank");
      flag = 0;
    } else {
      setSuccessFor(document.getElementById("walletID"));
    }
  
    if (newPassword === "") {
      setErrorFor(document.getElementById("new-password"), "New password cannot be blank");
      flag = 0;
    } else if (newPassword.length < 8) {
      setErrorFor(document.getElementById("new-password"), "Password length can't be less than 8 characters");
      flag = 0;
    } else {
      setSuccessFor(document.getElementById("new-password"));
    }

    if (confirmpassword === "") {
      setErrorFor(document.getElementById("confirm-password"), "Confirm password cannot be blank");
      flag = 0;
    } else if (confirmpassword !== newPassword) {
      setErrorFor(document.getElementById("confirm-password"), "Passwords do not match");
      flag = 0;
    } else {
      setSuccessFor(document.getElementById("confirm-password"));
    }

    if (secret === "") {
      setErrorFor(document.getElementById("secret"), "Secret cannot be blank");
      flag = 0;
    } else {
      setSuccessFor(document.getElementById("secret"));
    }
  
    if (flag === 1) {
      const hashnewpassword = CryptoJS.SHA256(newPassword).toString();
      const userdata = {
        walletID,
        hashnewpassword
      };
      const digitalsignature = signData(userdata, secret);
      fetch('/forgetpassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userdata,digitalsignature }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Password updated successfully');
          window.location.href = '/login.html';
        } else {
          handleLoginError("Password update failed: " + data.message);
        }
      })
      .catch(error => {
        handleLoginError("Password update failed: " + (error.message || "Unknown error"));
        console.error('Error:', error);
      });
    }
  });
  
function setErrorFor(input, message) {
  const formControl = input.parentElement;
  const small = formControl.querySelector("small");
  small.innerText = message;
  formControl.className = "input-group error";
}
  
function setSuccessFor(input) {
  const formControl = input.parentElement;
  formControl.className = "input-group success";
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

function signData(data, privateKey) {
  const EC = elliptic.ec;
  const ec = new EC('secp256k1');
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const msgHash = CryptoJS.SHA256(JSON.stringify(data)).toString(CryptoJS.enc.Hex);  
  const signature = keyPair.sign(msgHash);
  return {
      r: signature.r.toString('hex'),
      s: signature.s.toString('hex')
  };
}
  