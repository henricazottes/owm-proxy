
const express = require('express')
const request = require('request')

const app = express()
const PORT = process.env.PORT || 3000
const API_KEY = process.env.API_KEY
const CITY    = process.env.CITY
const BASE_URL = process.env.BASE_URL
const UNITS = process.env.UNITS

function mod(n, m) {
  return ((n % m) + m) % m;
}

function validateReqAndGetParams(req){
  api_key = req.query.appid || API_KEY
  location = req.query.q || CITY
  units = req.query.units || UNITS
  if (!location || !api_key) {
    return undefined
  }
  return {
    "appid":   api_key,
    "units":    units,
    "q":        location,
  }
}

function getQuery(path, params) {
  return BASE_URL + path + "?" + Object.keys(params).map(key => `${key}=${params[key]}`).join('&')
}

function extractWeatherChunk(chunk) {
  let obj = {}
  Object.keys(chunk).forEach(key => {
    let current_value = chunk[key]
    if (key == "weather") {
      obj.weather = current_value[0].id
    } else if (key == "main") {
      obj.temp = current_value.temp
    }
  })
  obj.dt = Math.floor(new Date().getTime()/1000)
  return obj
}

function getMostPresentWeatherIdsByDay(chunkList) {
  chunkList = chunkList.map(chunk => {
    let obj = {}
    Object.keys(chunk).forEach(key => {
      let current_value = chunk[key]
      if (key == "weather") {
        obj.weatherId = current_value[0].id
      } else if (key == "dt") {
        obj.dt = current_value
      }
    })
    return obj
  })


  let groupedByDay = chunkList.reduce((prev, chunk) => {
    let date  = new Date(chunk.dt*1000)
    let day   = mod(date.getDay()-1, 7)
    let prevCounterValue = prev[day][chunk.weatherId] || 0
    let counterValue = ++prevCounterValue
    prev[day][chunk.weatherId] = counterValue
    return prev
  }, [{},{},{},{},{},{},{}])

  let mostPresentIdByDay = groupedByDay.map((sort, index) => {
    currentDayIds = groupedByDay[index]
    return Number(Object.keys(sort).sort((a,b) => currentDayIds[a] > currentDayIds[b])[0]) || -1
  })

  return mostPresentIdByDay
}

app.get('/forecast', function (req, res) {
  let params = validateReqAndGetParams(req)
  if (!params){
    return res.status(400).send('Bad Request')
  }

  let query = getQuery(req.path, params)
  request(query, function (error, response, body) {
    let json  = JSON.parse(body)
    let obj   = { list: getMostPresentWeatherIdsByDay(json.list) }
    res.set('Content-Type', 'application/json');
    res.send(obj)
  })
})

app.get('/weather', function (req, res) {
  let params = validateReqAndGetParams(req)
  if (!params){
    return res.status(400).send('Bad Request')
  }

  let query = getQuery(req.path, params)
  request(query, function (error, response, body) {
    let json = JSON.parse(body)
    let obj = extractWeatherChunk(json)
    res.set('Content-Type', 'application/json');
    res.send(obj)
  })
})

app.get('/', function (req, res) {
  res.send("Hello world :)")
})

app.listen(PORT, function () {
  console.log(`Example app listening on port ${PORT}`)
})