const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const moment = require('moment');

const mysql = require('mysql');
const mysqlLocal = mysql.createPool({
    multipleStatements: true,
    connectionLimit: 1000,
    host: 'ddolfsb30gea9k.c36ugxkfyi6r.us-west-2.rds.amazonaws.com',
    user: 'kmocorro',
    password: 'kmocorro123',
    database: 'fab4_apps_db'
});

const app = express();
const port = process.env.PORT || 9001;

app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(helmet());
app.use(morgan('combined'));
app.use('/', express.static(__dirname + '/public'));

// index
app.get('/', (req, res) => {

    let employeeNumber = req.query.e;

    if(employeeNumber) {
        isRegistered().then((registered) => {
            if(!registered){
                searchEmployee(registered).then((employee_details) => {
                    res.status(200).json(employee_details);
                },  (err) => {

                    res.status(200).json({err: err});
                })
            } else {
                // already registereddddd -- > 
                searchEmployee(registered).then((employee_details) => {
                    res.status(200).json(employee_details);
                },  (err) => {
                    res.status(200).json({err: err});
                })
            }
        }, (err) => {
            res.status({err: err});
        })
    } else {
        res.status(200).json({search: true});
    }

    function isRegistered(){
        return new Promise((resolve, reject) => {
            mysqlLocal.getConnection((err, connection) => {
                if(err){return reject(err)};

                connection.query({
                    sql: 'SELECT * FROM yep2019_present WHERE employeeNumber = ?',
                    values: [employeeNumber]
                },  (err, results) => {
                    if(err){reject(err)}

                    if(typeof results !== 'undefined' && results !== null && results.length > 0){
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                });

                connection.release();
            });
        });
    }

    function searchEmployee(isRegistered){
        return new Promise((resolve, reject) => {
            mysqlLocal.getConnection((err, connection) => {
                if(err){return reject(err)};

                connection.query({
                    sql: 'SELECT * FROM yep2019_venue WHERE employeeNumber = ?',
                    values: [employeeNumber]
                }, (err, results) => {
                    if(err){reject(err)}

                    function changeCaseFirstLetter(params) {
                        if(typeof params === 'string') {
                                return params.charAt(0).toUpperCase() + params.slice(1);
                        }
                        return null;
                    }

                    let employee_details = [];

                    if(typeof results !== 'undefined' && results !== null && results.length > 0){
                        employee_details.push({
                            id: results[0].id,
                            employeeNumber: results[0].employeeNumber,
                            lastname: results[0].lastname,
                            firstname: results[0].firstname,
                            department: results[0].department,
                            shift: results[0].shift,
                            service_awardee: results[0].service_awardee,
                            transportation: changeCaseFirstLetter(results[0].transportation),
                            incomingRoute: results[0].incomingRoute,
                            outgoingRoute: results[0].outgoingRoute,
                            isEmployeeRegistered: isRegistered
                        });

                        resolve(employee_details);
                    } else {
                        reject("No results found.");
                    }

                });

                connection.release();
            })

        });
    }

})

app.post('/api/enter', (req, res) => {
    
    let employeeNumber = req.body.employeeNumber;

    if(employeeNumber){
        isRegistered().then((registered) => {
            if(!registered){
                enterToParty().then(() => {
                    res.status(200).json({success: 'Registered successfully!'});
                });
            } else {
                res.status(200).json({success: 'Already registered.'});
            }
        })
    }

    function isRegistered(){
        return new Promise((resolve, reject) => {
            mysqlLocal.getConnection((err, connection) => {
                if(err){return reject(err)};

                connection.query({
                    sql: 'SELECT * FROM yep2019_present WHERE employeeNumber = ?',
                    values: [employeeNumber]
                },  (err, results) => {
                    if(err){reject(err)}

                    if(typeof results !== 'undefined' && results !== null && results.length > 0){
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                });

                connection.release();
            });
        });
    }

    function enterToParty(){
        return new Promise((resolve, reject) => {
            mysqlLocal.getConnection((err, connection) => {
                if(err){reject(err)};

                connection.query({
                    sql: 'INSERT INTO yep2019_present SET dt = ?, employeeNumber = ?',
                    values: [new Date(), employeeNumber]
                },  (err, results) => {
                    if(err){reject(err)}

                    console.log(results);
                    resolve()

                });

                connection.release();

            });

        });
    }

})

app.get('/listahan', (req, res) => {

    loadData().then((registered_list) => {
        res.status(200).json(registered_list);
    },  (err) => {
        res.status(200).json({err: err});
    });

    function loadData(){
        return new Promise((resolve, reject) => {
            mysqlLocal.getConnection((err, connection) => {
                if(err){return reject(err)}

                connection.query({
                    sql: 'SELECT a.id as id, a.dt as dt, a.employeeNumber as employeeNumber, b.firstname as firstname, b.lastname as lastname, b.shift as shift FROM yep2019_present a JOIN yep2019_venue b ON a.employeeNumber = b.employeeNumber ORDER BY a.id DESC;'
                },  (err, results) => {
                    if(err){return reject(err)}

                    let registered_list = [];

                    if(typeof results !== 'undefined' && results !== null && results.length > 0 ){

                        for(let i=0; i<results.length; i++){

                            registered_list.push({
                                id: results[i].id,
                                dt: moment(results[i].dt).calendar(),
                                employeeNumber: results[i].employeeNumber,
                                firstname: results[i].firstname,
                                lastname: results[i].lastname,
                                shift: results[i].shift
                            })
                        }

                        resolve(registered_list);
                    } else {
                        resolve([])
                    }

                });
                
                connection.release();
            });

        });
    }

});

app.listen(port, () => {
    console.log('Listening to port ' + port + '...');
});

