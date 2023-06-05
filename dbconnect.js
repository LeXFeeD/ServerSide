const mysql = require('mysql');

// конфиг 
const connection = mysql.createConnection({
    host: 'bl9ikqxzdngbx1f70x14-mysql.services.clever-cloud.com', //hostname
    user: 'uvpx3l82pdek1s9q',  //username
    password: '2dLfyiuOlyrxf4Mjfg5A', //password
    database: 'bl9ikqxzdngbx1f70x14' //db_name
});

//создание подключения
connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL database: ' + err.stack);
      return;
    }
    console.log('Connected to MySQL database with ID ' + connection.threadId);
});






/*// Выполнение запроса
connection.query('SELECT * FROM table_name', (err, results, fields) => {
  if (err) {
    console.error('Error executing MySQL query: ' + err.stack);
    return;
  }
  console.log(results);
});

// Закрытие соединения
connection.end((err) => {
  if (err) {
    console.error('Error closing MySQL database connection: ' + err.stack);
    return;
  }
  console.log('MySQL database connection closed.');
});*/
