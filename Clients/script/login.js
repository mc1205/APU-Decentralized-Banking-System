document.getElementById("login-form").addEventListener("submit", function (event) {
  event.preventDefault();

  const loginStatusElement = document.querySelector(".login-status");
  if (!loginStatusElement) {
    console.error("Login status element not found");
  } else {
    loginStatusElement.className = "login-status";
  }
  
  const walletIDElement = document.getElementById("login-walletID");
  const passwordElement = document.getElementById("login-password");

  if (!walletIDElement) {
    console.error("Wallet ID element not found");
  }
  if (!passwordElement) {
    console.error("Password element not found");
  }

  const walletID = walletIDElement ? walletIDElement.value.trim() : "";
  const password = passwordElement ? passwordElement.value.trim() : "";

  if (walletID === "") {
    setErrorFor(walletIDElement, "Wallet ID cannot be blank");
  } else {
    setSuccessFor(walletIDElement);
  }

  if (password === "") {
    setErrorFor(passwordElement, "Password cannot be blank");
  } else {
    setSuccessFor(passwordElement);
  }

  if (walletID !== "" && password !== "") {
    const hashnewpassword = CryptoJS.SHA256(password).toString();
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ walletID, hashnewpassword }),
    })
    .then((response) => {
      if (!response.ok) {
        return response.json().then(err => { throw err; });
      }
      return response.json();
    })
    .then((data) => {
      if (data.success === true) {
        sessionStorage.setItem("username", data.user.username);
        sessionStorage.setItem("walletID", data.user.walletID);
        
        const transactionContainer = document.getElementById("transaction-container");
        if (!transactionContainer) {
          console.error("Transaction container element not found");
        } else {
          transactionContainer.style.display = "block";
        }

        if (loginStatusElement) {
          loginStatusElement.innerText = "Login successful";
          loginStatusElement.className = "login-status success";
        }

        alert("Login Successful");
        window.location.href = '/customer/customer.html';
      } else {
        handleLoginError("Login failed: " + data.message);
      }
    })
    .catch((error) => {
      handleLoginError("Login Error: " + (error.message || "Unknown error"));
      console.error("Error:", error);
    });
  }
});

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
