document.getElementById("setting-change-password").addEventListener("submit", function(event) {
    event.preventDefault();
  
    let flag = 1;
    const walletID = sessionStorage.getItem('walletID');
    const currentpassword = document.getElementById("current-password").value.trim();
    const newpassword = document.getElementById("new-password").value.trim();
    const confirmpassword = document.getElementById("confirm-password").value.trim();
  
    if (currentpassword === "") {
      setErrorFor(document.getElementById("current-password"), "Current Password cannot be blank");
      flag = 0;
    } else {
      setSuccessFor(document.getElementById("current-password"));
    }
  
    if (newpassword === "") {
        setErrorFor(document.getElementById("new-password"), "New Password cannot be blank");
        flag = 0;
      } else if (newpassword.length < 8) {
        setErrorFor(document.getElementById("new-password"), "Password length can't be less than 8 characters");
        flag = 0;
      } else {
        setSuccessFor(document.getElementById("new-password"));
      }
    
      if (confirmpassword === "") {
        setErrorFor(document.getElementById("confirm-password"), "Password Confirm cannot be blank");
        flag = 0;
      } else if (confirmpassword !== newpassword) {
        setErrorFor(document.getElementById("confirm-password"), "Passwords do not match");
        flag = 0;
      } else {
        setSuccessFor(document.getElementById("confirm-password"));
      }
  
    if (flag === 1) {
      const hashcurrentpassword = CryptoJS.SHA256(currentpassword).toString();
      const hashnewpassword = CryptoJS.SHA256(newpassword).toString();
      fetch('/setting-change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentpassword: hashcurrentpassword , newpassword: hashnewpassword, walletID: walletID  }),
      })
      .then(response => response.json())
          .then(data => {
              if (data.success) {
                  handleLoginsuccess("Password Update Successful");
                  alert('Password Update Successful!');
              } else {
                  handleLoginError("Password Update Failed: " + data.message);
                  alert(`Password Update Failed: ${data.message}`);
              }
          })
          .catch(error => {
              handleLoginError("Password Update Failed: " + error.message);
              console.error('Password Update Failed:', error);
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
  
  function handleLoginsuccess(message) {
    const loginStatus = document.querySelector(".login-status");
    if (loginStatus) {
      loginStatus.innerText = message;
      loginStatus.className = "login-status success";
    } else {
      console.error("Login status element not found for success message");
    }
  }
  