console.log("script loaded");

async function verifyUser() {

    console.log("Button clicked");

    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];

    console.log(file);

    if (!file) {
        alert("Please Select Image");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/mark-attendance",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();
        console.log(data);

        document.getElementById("result").innerText = data.message;

    } catch (error) {

        console.error(error);
        document.getElementById("result").innerText = "Server Error";
    }
}

// ✅ THIS LINE WAS MISSING
document.getElementById("markBtn").addEventListener("click", verifyUser);