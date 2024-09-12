document.getElementById("register-form").addEventListener("submit", function (event) {
  event.preventDefault();

  let flag = 1;
  const name = document.getElementById("register-name").value.trim();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const passwordconfirm = document.getElementById("register-confirmpassword").value.trim();
  const email = document.getElementById("register-email").value.trim();

  if (name === "") {
    setErrorFor(document.getElementById("register-name"), "Name cannot be blank");
    flag = 0;
  } else {
    setSuccessFor(document.getElementById("register-name"));
  }

  if (username === "") {
    setErrorFor(document.getElementById("register-username"), "Username cannot be blank");
    flag = 0;
  } else {
    setSuccessFor(document.getElementById("register-username"));
  } 

  if (password === "") {
    setErrorFor(document.getElementById("register-password"), "Password cannot be blank");
    flag = 0;
  } else if (password.length < 8) {
    setErrorFor(document.getElementById("register-password"), "Password length can't be less than 8 characters");
    flag = 0;
  } else {
    setSuccessFor(document.getElementById("register-password"));
  }

  if (passwordconfirm === "") {
    setErrorFor(document.getElementById("register-confirmpassword"), "Password Confirm cannot be blank");
    flag = 0;
  } else if (passwordconfirm !== password) {
    setErrorFor(document.getElementById("register-confirmpassword"), "Passwords do not match");
    flag = 0;
  } else {
    setSuccessFor(document.getElementById("register-confirmpassword"));
  }

  if (email === "") {
    setErrorFor(document.getElementById("register-email"), "Email cannot be blank");
    flag = 0;
  } else {
    setSuccessFor(document.getElementById("register-email"));
  }

  if (flag === 1) {
    const hashnewpassword = CryptoJS.SHA256(password).toString();
    fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        username: username,
        password: hashnewpassword,
        email: email
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          document.getElementById("walletID").textContent = data.walletID;
          document.getElementById("privateKey").textContent = data.privateKey;
          document.getElementById("keyModal").style.display = "block";

          document.getElementById("closeModal").addEventListener("click", function() {
            document.getElementById("keyModal").style.display = "none";
            window.location.href = '/login.html';
          });
        } else {
          const loginStatus = document.querySelector(".login-status");
          loginStatus.innerText = "Registeration Failed";
          loginStatus.className = "login-status error";
        }
      })
      .catch((error) => {
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
