const functions = require('firebase-functions')
const firebase = require('firebase-admin')
const { error } = require('firebase-functions/lib/logger')
var config = {
  apiKey: 'AIzaSyDKUTIUzqfbyW4jCzq96NRSM7BnnGJRpL4',
  authDomain: 'cmoto-4267a.web.app',
  databaseURL: 'https://cmoto-4267a.firebaseio.com',
  storageBucket:
    'https://console.firebase.google.com/project/cmoto-4267a/storage/cmoto-4267a.appspot.com',
}
firebase.initializeApp(config)

const accountSid = 'ACe4789c3d43bd020626b5dfca34a4fb08'
const authToken = '9ea4def143de17e5a51d0cba2861675e'
const client = require('twilio')(accountSid, authToken)
const BitlyClient = require('bitly').BitlyClient
const bitly = new BitlyClient('ba758c7d1927eb82aa87b23740becb7cc50b3bac')

// Get a reference to the database service
var database = firebase.database()

// this will update database for regular change i.e. cleaning cars , removing cleaned cars, updating to do cars
var Cars
exports.UpdatingDataBase = functions.database
  .ref('/Car Status/{CarNumber}')
  .onUpdate((change, context) => {
    // console.log("updation of cars work started");
    const before = change.before.val()
    const after = change.after.val()
    if (before === after) {
      return null
    }
    if (after.status !== 'cleaned') {
      return null
    }
    if (before.status === after.status) {
      return null
    }
    const employeeId = before.doneBy
    //  console.log(employeeId);
    var todaysCarsLeft = ''
    var CarNumberToBeRemoved = ''
    var imageURL1 = ''
    var imageURL2 = ''

    var ref = database.ref('/Employee/' + employeeId)
    ref.once('value', async function (snapshot) {
      Cars = snapshot.val()
      // console.log('Cars = ' + Cars);
      if (!Cars) return null

      var sendTo = Cars.sendTo

      CarNumberToBeRemoved = context.params.CarNumber
      todaysCarsLeft = newTodaysCars(CarNumberToBeRemoved, Cars.todaysCars)
      // console.log('cars to be removed = ' + CarNumberToBeRemoved);
      await ref.update({ todaysCars: todaysCarsLeft })
      var CarCatgory = Cars.Working_Address
      await firebase
        .database()
        .ref('Employees/' + CarCatgory + '/' + employeeId)
        .update({ todaysCars: todaysCarsLeft })
      await firebase
        .database()
        .ref(
          `Employee/${employeeId}/Missed Car History/${getTodayDate()}`
        )
        .update({ todaysCars: todaysCarsLeft })

      // check if payment is done than remove car from expired
      if (Cars.Days_Left === 29) {
        var obj = {}
        obj[CarNumberToBeRemoved] = null
        database.ref('Expired/' + CarCatgory).update(obj)
        database
          .ref('cars/' + CarCatgory + '/' + CarNumberToBeRemoved)
          .update({ Payment: 'Active' })
      }
      // updating employee earnings
      // first getting the category of car
      var category
      var price
      var income
      var carRef = database.ref(
        'cars/' + CarCatgory + '/' + CarNumberToBeRemoved
      )

      await carRef.once('value', (snapshot) => {
        category = snapshot.val().category
        if (
          category.toString().toLowerCase() === 'sedan' ||
          category.toString().toLowerCase() === 'luv'
        ) {
          price = 14
        } else if (
          category.toString().toLowerCase() === 'hatchback' ||
          category.toString().toLowerCase() === 'compactsedan'
        ) {
          price = 12
        } else if (category.toString().toLowerCase() === 'suv') {
          price = 18
        }
      })
      var EmployeeEarningRef = ref.child('Work History').child(getTodayDate())
      EmployeeEarningRef.once('value', async (snapshot) => {
        //  console.log(snapshot.val());

        if (snapshot.val() === null || isNaN(snapshot.val().income)) {
          //  console.log("Income is set to be zero :" + getTodayDate());
          EmployeeEarningRef.update({ income: 0 })
        } else {
          price = price + snapshot.val().income
        }
        imageURL1 = snapshot
          .child(CarNumberToBeRemoved)
          .child('Image Url 4')
          .val()
          .toString()
        //  console.log(price);
        // income = price
        // EmployeeEarningRef.update({ income: income })

        return bitly
          .shorten(imageURL1)
          .then((response) => {
const message = {
    from: 'whatsapp:+18154066941',
    body: `*Greeting from CMoTo!!*😊
    Your Car 🚘${CarNumberToBeRemoved}🚘  has been cleaned✨ and sanitised💦!!
    👇Click below to see your car👇
    ${response.link}`,
    to: `whatsapp:+919310331578`,
}
            console.log(imageURL1)

            const mssg = client.messages.create(message)
            console.log(mssg)

            return null
          })
          .catch((err) => {
            console.log('err ' + err)
          })
      })
    })

    return null
  })

// this will update database for interior cleaning of cars i.e. cleaning cars , removing cleaned cars, updating to do cars
exports.UpdatingDataBaseForInterior = functions.database
  .ref('/Car Status/{CarNumber}/Interior Cleaning status')
  .onUpdate(async (change, context) => {
    console.log("updation of interior cars started");
    const before = change.before.val()
    const after = change.after.val()
    //  console.log(after);
    if (before === after) return null

    if (change.after.val() !== 'cleaned') {
      return null
    }
    var employeeId = ''
    await change.before.ref.parent.child('doneBy').once('value', (snap) => {
      employeeId = snap.val()
    })
     console.log(employeeId);
    var todaysCarsLeft
    var CarNumberToBeRemoved

    var ref = database.ref('/InteriorEmployee/' + employeeId)
    ref.once('value', function (snapshot) {
      const Employee = snapshot.val()
      // console.log('Employee = ' + Employee);
      const daysCar = Employee.daysCar

      CarNumberToBeRemoved = context.params.CarNumber
      todaysCarsLeft = newTodaysCars(
        CarNumberToBeRemoved,
        Employee[daysCar].toString()
      )
      console.log('cars to be removed = ' + CarNumberToBeRemoved);
      console.log('daysCar = ' + daysCar);
      ref.update({ [daysCar]: todaysCarsLeft })
      // var CarCatgory = Employee.Working_Address
      var sendTo = Employee.sendTo
      // firebase
      //   .database()
      //   .ref('InteriorEmployees/' + CarCatgory + '/' + employeeId)
      //   .update({ [daysCar]: todaysCarsLeft })

      var EmployeeEarningRef = ref.child('Interior Work History').child(getTodayDate())
      EmployeeEarningRef.once('value', async (snapshot) => {
        //  console.log(snapshot.val());

        var imageURL1 = snapshot
          .child(CarNumberToBeRemoved)
          .child('Image Url 4')
          .val()
          .toString()
        //  console.log();

        return bitly
          .shorten(imageURL1)
          .then((response) => {
const message = {
    from: 'whatsapp:+18154066941',
    body: `*Greeting from CMoTo!!*😊
    Your Car 🚘${CarNumberToBeRemoved}🚘  has been cleaned✨ and sanitised💦!!
    👇Click below to see your car👇
    ${response.link}`,
    to: `whatsapp:+919310331578`,
}
            console.log(imageURL1)

            const mssg = client.messages.create(message)
            console.log('message ' + mssg)

            return null
          })
          .catch((err) => {
            console.log('err ' + err)
          })
      })
    })

    return null
  })

var areaname = []
var linkedUsers = new Map();
var clusterName = []
var employeeIdArray
var Employes
// regular Function to allocate cars to each employee and setting the status of each car to 'In Waiting'
exports.scheduledFunctionForSettingCars = functions.https.onRequest(
  (req, res) => {
    // this function will call the sequence of async functions and wait for thier data fetch
    getEmployeeRef()

    // this snippet will turn the status of car to "In waiting"
    var carStatusRef = database.ref('Car Status')
    carStatusRef.once('value', (snap) => {
      // console.log(snap.val());
      var carNums = Object.keys(snap.val())
      for (let i in carNums) {
        database
          .ref('Car Status/' + carNums[i])
          .update({ status: 'In waiting' })
        database.ref('Car Status/' + carNums[i]).update({ timeStamp: '0' })
      }
    })

    firebase
    .database()
    .ref('Employee')
    .once('value',(snap)=>{

      var employees = Object.keys(snap.val())
      for(let i in employees){
        database.ref(`Employee/${employees[i]}/status`).set('free')
        database.ref(`Employee/${employees[i]}/working on`).set('')
      }
    })

    // sending the response of function completion and ends up the https request
    res.send('function complete')
    res.end()
  }
)

// regular Function to allocate cars to each interior employee
exports.scheduledFunctionForSettingInteriorCars = functions.https.onRequest(
  (req, res) => {
    // this function will call the sequence of async functions and wait for thier data fetch
    getInteriorEmployeeRef()

    // this snippet will turn the status of car to "In waiting"
    var carStatusRef = database.ref('Car Status')
    carStatusRef.once('value', (snap) => {
      // console.log(snap.val());
      var carsNumbers = Object.keys(snap.val())
      for (let i in carsNumbers) {
        database
          .ref('Car Status/' + carsNumbers[i])
          .update({ 'Interior Cleaning status': 'In waiting' })
      }
    })

    // sending the response of function completion and ends up the https request
    res.send('function complete')
    res.end()
  }
)


// calling function || will be called by app
exports.callCustomer = functions.https.onRequest((req, ress) => {
  var key = '17c3ca687b6859c6a3dcd31c801823b526fd7fc8d80d94d0'
  var sid = 'cmoto1'
  var token = '2ba841367855778a638e199398ea093783ca0b08f0e50c74'
  var from = req.query.from
  var to = req.query.to

  const formUrlEncoded = (x) =>
    Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, '')

  const axios = require('axios')
  url =
    'https://' +
    key +
    ':' +
    token +
    '@api.exotel.in/v1/Accounts/' +
    sid +
    '/Calls/connect'
  axios
    .post(
      url,
      formUrlEncoded({
        From: from,
        To: to,
        CallerId: '01142213504',
        CallerType: 'promo',
      }),
      {
        withCredentials: true,
        headers: {
          Accept: 'application/x-www-form-urlencoded',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )
    .then((res) => {
      console.log(`statusCode: ${res.statusCode}`)
      console.log(res)
      ress.send('Calling request send')
      ress.end()
      return res
    })
    .catch((error) => {
      console.error(error)
      ress.end()
      return error
    })
})

var totalEmployee

// first function of chain of async function to add todaysCars in each employee
// this will will read the employee id and employee snapshot
async function getEmployeeRef() {
  var EmployeeRef = database.ref('Employee')

  await EmployeeRef.once('value', (snapshot) => {
    // console.log(snapshot.val());
    Employes = snapshot.val()
    employeeIdArray = Object.keys(Employes)
    totalEmployee = employeeIdArray.length
    // console.log(employeeIdArray);

    //this function will read out the values from employee snapshot which is needed like working address
    setEmployeeTodaysCars(Employes)
  })

  // this function will create the string of todaysCars and update it in employee section
  await setTodaysCars()

  return null
}

// first function of chain of async function to add todaysCars in each interior employee
// this will will read the employee id and employee snapshot
async function getInteriorEmployeeRef() {
  console.log('start')
  var EmployeeRef = database.ref('InteriorEmployee')

  try {
    await EmployeeRef.once(
      'value',
      (snapshot) => {
        // console.log('entered')
        console.log(snapshot.val())
        Employes = snapshot.val()
        employeeIdArray = Object.keys(Employes)
        totalEmployee = employeeIdArray.length
        console.log(employeeIdArray)

        setInteriorEmployeeTodaysCars(Employes)
      },
      (err) => {
        console.log(err)
      }
    )

    // this function will create the string of todaysCars and update it in employee section
    setInteriorTodaysCars()
  } catch (error) {
    console.log(error)
  }

  return null
}

function setEmployeeTodaysCars(Employes) {
  for (let EmployeeId in Employes) {
    var employeId = Employes[EmployeeId]
    areaname.push(employeId.Working_Address)

    // console.log(employeId);
    // console.log(areaname);
    clusterName.push(employeId.ClusterNumber)
    // console.log(clusterName);
  }

  return null
}

async function setTodaysCars() {
  var i = 0
  var j = 0
  for (k = 0; k < employeeIdArray.length; k++) {
    var ClusterRef = database.ref(`Employee/${employeeIdArray[i]}/Cluster`)
    // console.log(`${i}:cars/clusters/${areaname[i]}/${clusterName[i]}/CarLocations`);
    ClusterRef.once('value', (snap) => {
      var carsnum = snap.val()
      // console.log(carsnum);

      var carsNumber = Object.keys(carsnum)
      // console.log("c=" + carsNumber);
      var employeeid = employeeIdArray[j]
      // console.log("id : "+j+employeeid);
      database.ref('Employee/' + employeeid).update({ todaysCars: carsnum })
      database
        .ref('Employee/' + employeeid)
        .child('Missed Car History')
        .child(getTodayDate())
        .update({ todaysCars: carsnum })
      // console.log(areaname[j]);
      database
        .ref('Employees/' + areaname[j] + '/' + employeeid)
        .update({ todaysCars: carsnum })
      // console.log('one cycle complete' + Object.keys(Employes)[j]);
      j++
    })

    i++
  }
  return null
}

function setInteriorEmployeeTodaysCars(Employes) {
  for (let EmployeeId in Employes) {
    var employeId = Employes[EmployeeId]
    console.log(EmployeeId)
    areaname.push(employeId.Working_Address)
    const linkedWith = employeId.linkedWith.toString().split(',')
    linkedUsers[EmployeeId + '0'] = linkedWith[0]
    linkedUsers[EmployeeId + '1'] = linkedWith[1]
  }

  return null
}

async function setInteriorTodaysCars() {
  console.log('second start : ')
  var i = 0
  var j = 0
  for (k = 0; k < employeeIdArray.length; k++) {
    var carsRef = database.ref(`Employee/${linkedUsers[employeeIdArray[i]+'0']}/Cluster`)
    console.log(linkedUsers)
    /* eslint-disable no-await-in-loop */
    await carsRef.once(
      'value',
      async (snap) => {
        var carsnum = snap.val().toString()
        console.log(carsnum);
        var carsNumbers = carsnum
          .replace(/\s+/g, '')
          .split(',')
          .filter((el) => {
            return el !== ''
          })
        console.log('c=' + carsNumbers)
        var carsRef1 = database.ref(
          `Employee/${linkedUsers[employeeIdArray[i]+'1']}/Cluster`
        )
        await carsRef1.once('value', async (snap1) => {
          var carsnum1 = snap1.val().toString()
          console.log('c2 = ' + carsnum1)
          var carsNumber = carsnum1
            .replace(/\s+/g, '')
            .split(',')
            .filter((el) => {
              return el !== ''
            })
          console.log(carsNumbers)
          carsNumber = [...carsNumber, ...carsNumbers]
          // console.log(carsNumber)

          var carWithDate = []
          for (let i in carsNumber) {
            /* eslint-disable no-await-in-loop */
            await database
              .ref(`Car Status/${carsNumber[i]}/lastCleanedInterior`)
              .once('value', (snap2) => {
                var car = carsNumber[i]
                var d = snap2.val()
                var carObj = {
                  number: car,
                  date: d,
                }
                carWithDate.push(carObj)
              })
          }

          console.log(carWithDate)

          try {
            carWithDate.sort(function (b, a) {
              return new Date(b.date) - new Date(a.date)
            })
          } catch (err) {
            console.log(err)
          }

          console.log('last : ' + carWithDate)

          carsNumber = []
          carWithDate.map((el) => {
            carsNumber.push(el.number)
          })


          // var Cars = chunkify(carsNumber, 5, true)
          // var mondayCars = Cars[0]
          // var tuesdayCars = Cars[1]
          // var wednesdayCars = Cars[2]
          // var thursdayCars = Cars[3]
          // var fridayCars = Cars[4]

          var mondayCars = ''
          var tuesdayCars = ''
          var wednesdayCars = ''
          var thursdayCars = ''
          var fridayCars = ''

          for(let i in carsNumber){
            if(i<=12){
              mondayCars = mondayCars + ',' + carsNumber[i].toString()
            }else if(i<=24){
              tuesdayCars = tuesdayCars + ',' + carsNumber[i].toString()
            }else if(i<=36){
              wednesdayCars = wednesdayCars + ',' + carsNumber[i].toString()
            }else if(i<=48){
              thursdayCars = thursdayCars + ',' + carsNumber[i].toString()
            }else{
              fridayCars = fridayCars + ',' + carsNumber[i].toString()
            }
          }



          var employeeid = employeeIdArray[j]

          console.log(mondayCars)
          console.log(tuesdayCars)
          console.log(wednesdayCars)
          console.log(thursdayCars)
          console.log(fridayCars)
          // console.log("id : "+j+employeeid);
          database
            .ref('InteriorEmployee/' + employeeid)
            .update({ mondayCars: mondayCars })
          database
            .ref('InteriorEmployee/' + employeeid)
            .update({ tuesdayCars: tuesdayCars })
          database
            .ref('InteriorEmployee/' + employeeid)
            .update({ wednesdayCars: wednesdayCars })
          database
            .ref('InteriorEmployee/' + employeeid)
            .update({ thursdayCars: thursdayCars })
          database
            .ref('InteriorEmployee/' + employeeid)
            .update({ fridayCars: fridayCars })

          j++
        })
      },
      (err) => {
        console.log(err)
      }
    )

    i++
  }
  /* eslint-enable no-await-in-loop */
  return null
}

function getGroup() {
  var group = 'Group'
  // console.log(parseInt(getTodayDate().toString().substring(0,2)));
  if (
    parseInt(getTodayDate().toString().substring(0, 2)) < 7 ||
    (parseInt(getTodayDate().toString().substring(0, 2)) > 15 &&
      parseInt(getTodayDate().toString().substring(0, 2)) < 23)
  ) {
    group = group + 'A'
  } else {
    group = group + 'B'
  }
  return group
}

/* <-------- removing old car and making new list --------->  */
function newTodaysCars(carsNameToBeRemoved, todaysCars) {
  var str = todaysCars.replace(carsNameToBeRemoved, '')
  // console.log(str);
  return str
}

// <------------- sorting of json ------------->
function getCarNumbers(objs) {
  var objArray = []
  var numberArray = {}
  Object.keys(objs).forEach((element) => {
    objArray.push(objs[element])
  })
  objArray.sort((a, b) => parseFloat(a.houseNumber) - parseFloat(b.houseNumber))

  for (var i = 0; i < objArray.length; i++) {
    numberArray[' ' + objArray[i]['number']] = objArray[i]
  }

  return numberArray
}

// <------------- today's Date ------------->
function getTodayDate() {
  var todayUs = new Date()
  var offset = '+5.5' // since database belongs to US
  var utc = todayUs.getTime() + todayUs.getTimezoneOffset() * 60000 // therefore converting time to IST
  var today = new Date(utc + 3600000 * offset)
  var dd = String(today.getDate()).padStart(2, '0')
  var mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
  var yyyy = today.getFullYear()

  today = yyyy + '-' + mm + '-' + dd
  // console.log(today);
  return today
}

// <<----------------- divide cars day wise for interior emplloyee -------------------->>
function chunkify(a, n, balanced) {
  if (n < 2) return [a]

  var len = a.length,
    out = [],
    i = 0,
    size

  if (len % n === 0) {
    size = Math.floor(len / n)
    while (i < len) {
      out.push(a.slice(i, (i += size)))
    }
  } else if (balanced) {
    while (i < len) {
      size = Math.ceil((len - i) / n--)
      out.push(a.slice(i, (i += size)))
    }
  } else {
    n--
    size = Math.floor(len / n)
    if (len % size === 0) size--
    while (i < size * n) {
      out.push(a.slice(i, (i += size)))
    }
    out.push(a.slice(size * n))
  }

  return out
}
