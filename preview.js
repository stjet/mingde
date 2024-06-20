const http = require("http");
const path = require("path");
const fs = require("fs");

//adapted from github.com/jetstream0/hedgeblog's preview.ts

const port = 1381;

http.createServer((req, res) => {
  let p = (new URL(req.url, "http://notimportant.com")).pathname;
  let req_path;
  if (!p.includes(".")) {
    req_path = path.join(__dirname, "src", p, "index.html");
  } else {
    req_path = path.join(__dirname, "src", p);
  }
  if (!fs.existsSync(req_path)) {
    res.writeHead(404);
    //write file
    res.write("404");
    return res.end();
  }
  //set content type
  let non_utf8_content_types = ["image/png", "image/gif"];
  let content_type;
  switch (req_path.split(".")[1]) {
    case "html":
      content_type = "text/html; charset=utf-8";
      break;
    case "css":
      content_type = "text/css; charset=utf-8";
      break;
    case "js":
      content_type = "text/javascript";
      break;
    case "png":
    case "ico":
      content_type = "image/png";
      break;
    default:
      content_type = "text/plain";
  }
  res.writeHead(200, {
    'Content-Type': content_type,
  });
  //write file
  if (non_utf8_content_types.includes(content_type)) {
    res.write(fs.readFileSync(req_path));
  } else {
    res.write(fs.readFileSync(req_path, "utf-8"));
  }
  //end response
  res.end();
}).listen(port);

console.log(`Preview on port ${port}`);
