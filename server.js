require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());
const crypto = require("crypto");
const fs = require("fs");

const nodemailer = require("nodemailer");
const mysql = require("mysql2");

const jsonParser = express.json({ limit: "50mb" });

const pool = mysql.createPool({
  connectionLimit: 5,
  waitForConnections: true,
  host: "bl9ikqxzdngbx1f70x14-mysql.services.clever-cloud.com", //hostname
  user: "uvpx3l82pdek1s9q", //username
  password: "2dLfyiuOlyrxf4Mjfg5A", //password
  database: "bl9ikqxzdngbx1f70x14", //db_name
  port: 3306,

  queryFormat: function (query, values) {
    if (!values) return query;
    return query.replace(
      /\:(\w+)/g,
      function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this)
    );
  },
});

const promisePool = pool.promise();

const transporter = nodemailer.createTransport({
  host: "smtp.mail.ru",
  port: 465,
  secure: true,
  auth: {
    user: "lecha.dolgov2004gmail.com@mail.ru",
    pass: "mR5tJfM2b6MH3pibTQ7N",
  },
});

// connection.connect((err) => {
//   if (err) {
//     console.error("Error connecting to MySQL database: " + err.stack);
//     return;
//   }
//   console.log("Connected to MySQL database with ID " + connection.threadId);
// });

function readFileImage(file) {
  const bitmap = fs.readFileSync(file);
  const buf = new Buffer.from(bitmap);
  return buf;
}
const data = fs.readFileSync("./images/user-account.png");

app.post("/sendCode", jsonParser, (request, respond) => {
  try {
    const { login, password, email } = request.body; //need photo
    const code = crypto.randomUUID();
    pool.getConnection((err, connection) => {
      connection.query(
        "SELECT * FROM Users where `Email` = " + `'${email}'`,
        (err, res, fields) => {
          if (res.length > 0) {
            return respond.status(409).send({ message: "exists" });
          } else {
            transporter.sendMail(
              {
                from: "AlexeyDiplom <lecha.dolgov2004gmail.com@mail.ru>",
                to: email,
                subject: "Спасибо за регистрацию",
                text: `Спасибо за регистрацию на моем сервисе, вот ваш код: ${code}`,
              },
              (error, info) => {
                if (error) return console.log(error);
                return;
              }
            );

            connection.query(
              "INSERT INTO Users(`id_Role`,`Login`, `Password`, `Email`,`Photo`) VALUES(" +
              `'1','${login}','${password}','${email}', BINARY(:data)` +
              ")",
              { data },
              (err) => {
                if (err) throw err;
              }
            );

            pool.releaseConnection(connection);
            return respond.send({ code }).status(200);
          }
        }
      );
    });
  } catch (error) {
    console.log(error);
    pool.releaseConnection(connection);
    return respond.sendStatus(500);
  }
});

app.post("/enterUser", jsonParser, (request, respond) => {
  try {
    const { login, password, email } = request.body;
    pool.getConnection((err, connection) => {
      connection.query(
        "SELECT * FROM Users where `Email` = " + `'${email}'`,
        (err, res, fields) => {
          if (res.length > 0) {
            const { Login, Password, User_id } = res[0];
            if (Login === login && Password === password) {
              respond.status(200).send({ message: "Success", user_id: User_id });
              pool.releaseConnection(connection);
            } else {
              respond.status(409).send({ message: "Wrong data" });
              pool.releaseConnection(connection);
            }
          } else {
            respond.status(404).send({ message: "Doesn't exist" });
            pool.releaseConnection(connection);
          }
        }
      );
    });
  } catch (error) {
    pool.releaseConnection(connection);
    console.log(error);
    return respond.sendStatus(500);
  }
});

app.post("/resetCode", jsonParser, (request, respond) => {
  try {
    const { email } = request.body;
    pool.getConnection((err, connection) => {
      connection.query(
        "SELECT * FROM Users where `Email` = " + `'${email}'`,
        (err, res, fields) => {
          if (res.length > 0) {
            const code = crypto.randomUUID();
            transporter.sendMail(
              {
                from: "AlexeyDiplom <lecha.dolgov2004gmail.com@mail.ru>",
                to: email,
                subject: "Ваш код для восстановления пароля: ",
                text: `${code}`,
              },
              (error, info) => {
                if (error) return console.log(error);
                return;
              }
            );

            connection.query(
              "UPDATE Users SET `Reset_code` = " +
              `'${code}'` +
              " WHERE `Email` = " +
              `'${email}'`,
              (err, res, fields) => {
                if (err) {
                  console.log(err);
                }
              }
            );
            pool.releaseConnection(connection);
            return respond.sendStatus(200);
          }
        }
      );
    });
  } catch (error) {
    console.log(error);
    pool.releaseConnection(connection);
    return respond.sendStatus(500);
  }
});

app.post("/confirmCode", jsonParser, (request, respond) => {
  try {
    const { email, code } = request.body;
    pool.getConnection((err, connection) => {
      connection.query(
        "SELECT * FROM Users where `Email` = " +
        `'${email}' AND` +
        "`Reset_code` = " +
        `'${code}'`,
        (err, res, fields) => {
          if (res.length > 0) {
            pool.releaseConnection(connection);
            return respond.sendStatus(200);
          }
        }
      );
    });
  } catch (error) {
    console.log(error);
    pool.releaseConnection(connection);
    return respond.sendStatus(500);
  }
});

app.post("/changePassword", jsonParser, (request, respond) => {
  try {
    const { email, password } = request.body;
    pool.getConnection((err, connection) => {
      connection.query(
        "UPDATE Users SET `Password` = " +
        `'${password}'` +
        " WHERE `Email` = " +
        `'${email}'`,
        (err, res, fields) => {
          if (err) {
            console.log(err);
          }
        }
      );
      pool.releaseConnection(connection);
    });
    return respond.sendStatus(200);
  } catch (error) {
    console.log(error);
    return respond.sendStatus(500);
  }
});

app.post("/changeLogin", jsonParser, (request, respond) => {
  try {
    const { email, login } = request.body;
    pool.getConnection((err, connection) => {
      connection.query(
        "UPDATE Users SET `Login` = " +
        `'${login}'` +
        "WHERE `Email` = " +
        `'${email}'`,
        (err, res, fields) => {
          if (err) {
            console.log(err);
          }
        }
      );
      pool.releaseConnection(connection);
    });
  } catch (error) {
    console.log(error);
    pool.releaseConnection(connection);
    return respond.sendStatus(500);
  }
});

app.post("/changeImage", jsonParser, (request, respond) => {
  try {
    const { image, email } = request.body;
    // console.log(image);
    // const base64String = Buffer.from(image, 'base64').toString('binary');
    // console.log(base64String);
    const bufferValue = Buffer.from(image.substring(22), "base64");
    pool.getConnection((err, connection) => {
      connection.query(
        "UPDATE Users SET `Photo` = " +
        `BINARY(:bufferValue)` +
        "WHERE `Email` = " +
        `'${email}'`,
        { bufferValue },
        (err, res, fields) => {
          if (err) {
            console.log(err);
          }
        }
      );
      pool.releaseConnection(connection);
    });
  } catch (error) {
    console.log(error);
    return respond.sendStatus(500);
  }
});

app.post("/checkUser", jsonParser, (request, respond) => {
  try {
    const { email } = request.body;
    pool.getConnection((err, connection) => {
      connection.query(
        "SELECT * FROM Users where `Email` = " + `'${email}'`,
        (err, res, fields) => {
          if (res?.length > 0) {
            const photo = Buffer.from(res[0].Photo).toString("base64");
            pool.releaseConnection(connection);
            return respond
              .status(200)
              .send({ message: "Success", login: res[0].Login, photo: photo });
          } else {
            pool.releaseConnection(connection);
            return respond.status(404).send({ message: "Not exist" });
          }
        }
      );
    });
  } catch (error) {
    console.log(error);
    pool.releaseConnection(connection);
    return respond.sendStatus(500);
  }
});

app.get("/tablesName", jsonParser, (request, respond) => {
  try {
    pool.getConnection((err, connection) => {
      connection.query(
        " SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA=" +
        `'${process.env.DATABASE_NAME}'`,
        (err, res, fields) => {
          if (err) throw err;

          const tablesName = [];
          for (let i = 0; i < res.length; i++) {
            tablesName.push(res[i].TABLE_NAME);
          }
          respond.status(200).send({ names: tablesName, message: "Success" });
          pool.releaseConnection(connection);
        }
      );
    });
  } catch (error) {
    console.log(error);
    pool.releaseConnection(connection);
    return respond.sendStatus(500);
  }
});

app.post("/tableColumNames", jsonParser, (request, respond) => {
  try {
    const { tablesName } = request.body;

    pool.getConnection((err, connection) => {
      connection.query(
        "SELECT COLUMN_NAME, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME =" +
        `'${tablesName}'`,
        (err, res, fields) => {
          if (err) throw err;

          const columnsName = [];
          for (let i = 0; i < res.length; i++) {
            if (res[i].EXTRA !== "auto_increment") {
              columnsName.push(res[i].COLUMN_NAME);
            }
          }
          respond.status(200).send({ names: columnsName, message: "Success" });
          pool.releaseConnection(connection);
        }
      );
    });
  } catch (error) {
    console.log(error);
    pool.releaseConnection(connection);
    return respond.sendStatus(500);
  }
});

app.post("/tableAddData", jsonParser, (request, respond) => {
  try {
    let { tablesName, columnsName, data } = request.body;

    columnsName = columnsName.map((name) => "`" + name + "`");
    data = data.map((value) => `'${value}'`);

    const query =
      "INSERT INTO " +
      tablesName +
      "(" +
      columnsName.join(",") +
      ") VALUES(" +
      data.join(",") +
      ")";
    pool.getConnection((err, connection) => {
      connection.query(query, (err, res, fields) => {
        if (err) throw err;
        respond.sendStatus(200);
        pool.releaseConnection(connection);
      });
    });
  } catch (error) {
    console.log(error);
    pool.releaseConnection(connection);
    return respond.sendStatus(500);
  }
});

app.post("/tableGetData", jsonParser, (request, respond) => {
  try {
    const { tablesName } = request.body;

    pool.getConnection((err, connection) => {
      connection.query("SELECT * FROM " + tablesName, (err, res, fields) => {
        if (err) throw err;

        if (res.length > 0) {
          const tableData = [];
          const keys = Object.keys(res[0]);

          for (let i = 0; i < res.length; i++) {
            if (res[i].Photo) {
              res[i].Photo = Buffer.from(res[i].Photo).toString("base64");
            }

            tableData.push(res[i]);
          }
          respond
            .status(200)
            .send({ message: "Success", keys: keys, tableData: tableData });
          pool.releaseConnection(connection);
        }
      });
    });
  } catch (error) {
    console.log(error);
    return respond.sendStatus(500);
  }
});

app.post("/tableChangeData", jsonParser, (request, respond) => {
  try {
    let { tablesName, columnsName, data, id } = request.body;

    columnsName = columnsName.map((name) => "`" + name + "`");
    data = data.map((value) => `'${value}'`);

    let set = " SET ";

    let bufferValue;

    for (let i = 0; i < columnsName.length; i++) {
      if (i + 1 < columnsName.length) {
        if (columnsName[i] === "`Photo`") {
          bufferValue = Buffer.from(data[i], "base64");
          set += columnsName[i] + "=" + `BINARY(:bufferValue)` + ",";
        } else {
          set += columnsName[i] + "=" + data[i] + ",";
        }
      } else {
        if (columnsName[i] === "`Photo`") {
          bufferValue = Buffer.from(data[i], "base64");
          set += columnsName[i] + "=" + `BINARY(:bufferValue)`;
        } else {
          set += columnsName[i] + "=" + data[i];
        }
      }
    }

    const query =
      "UPDATE " +
      tablesName +
      set +
      " WHERE " +
      "`" +
      `${id[0]}` +
      "`" +
      "=" +
      `'${id[1]}'`;
    pool.getConnection((err, connection) => {
      connection.query(query, { bufferValue }, (err, res, fields) => {
        if (err) throw err;
        respond.sendStatus(200);
        pool.releaseConnection(connection);
      });
    });
  } catch (error) {
    console.log(error);
    return respond.sendStatus(500);
  }
});

app.post("/tableDeleteData", jsonParser, (request, respond) => {
  try {
    const { tablesName, id } = request.body;

    const query =
      "DELETE FROM " +
      tablesName +
      " WHERE " +
      "`" +
      `${id[0]}` +
      "`" +
      "=" +
      `${id[1]}`;
    pool.getConnection((err, connection) => {
      connection.query(query, (err, res, fields) => {
        if (err) throw err;
        respond.sendStatus(200);
        pool.releaseConnection(connection);
      });
    });
  } catch (error) {
    console.log(error);
    return respond.sendStatus(500);
  }
});

app.post("/getExpense", jsonParser, async (request, respond) => {
  try {
    const { email, moth } = request.body;
    let idUser;

    const dateId = [];
    const dateArray = [];
    const returnData = [];

    const getUserIdQuery =
      "SELECT User_id FROM `Users` WHERE Email = " + `'${email}'`;

    const [user] = await promisePool.execute(getUserIdQuery);
    idUser = user[0].User_id;

    const getExpense =
      "SELECT * FROM `Expenses` WHERE id_User = " + `'${idUser}'`;

    const [expenses] = await promisePool.execute(getExpense);

    for (let i = 0; i < expenses.length; i++) {
      if (!dateId.includes(expenses[i].Date_Exp)) {
        dateId.push(expenses[i].Date_Exp);
      }
    }

    const getDate = "SELECT * FROM `Date_Expenses` WHERE Id_DateExp = ";
    for (let i = 0; i < dateId.length; i++) {
      const query = getDate + dateId[i];
      const [date] = await promisePool.execute(query);
      const mothNumber = new Date(date[0].Date_Exp).getMonth() + 1;

      if (mothNumber === moth + 1) {
        dateArray.push(date[0]);
      }
    }

    for (let i = 0; i < dateArray.length; i++) {
      const query =
        getExpense + "AND Date_Exp = '" + dateArray[i].Id_DateExp + "'";
      const [expenses] = await promisePool.execute(query);

      for (let j = 0; j < expenses.length; j++) {
        const nameSumObject = {
          Name: expenses[j].Name_Exp,
          Sum: expenses[j].Sum_Exp,
        };

        returnData.push(nameSumObject);
      }
    }

    return respond.status(200).send(returnData);
  } catch (error) {
    console.log(error);
    return respond.sendStatus(500);
  }
});

app.listen(5000, () => {
  console.log("Server is running");
});
