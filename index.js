
const express = require('express')
const request = require('request')

const app = express()
const PORT = process.env.PORT || 3000
const API_KEY = process.env.API_KEY
const OWM_BASE_URL = "https://api.openweathermap.org/data/2.5"

function mod(n, m) {
  return ((n % m) + m) % m;
}

function getQuery(path, params) {
  return OWM_BASE_URL + path + "?" + Object.keys(params).map(key => `${key}=${params[key]}`).join('&')
}

function extractWeatherChunk(chunk) {
  let obj = {}
  Object.keys(chunk).forEach(key => {
    let current_value = chunk[key]
    if (key == "weather") {
      obj.weather = current_value[0].id
    } else if (key == "main") {
      obj.temp = current_value.temp
    } else if (key == "dt") {
      obj.dt = current_value
    }
  })
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
  let query_params = {
    "appid":   API_KEY,
    "units":    req.query.units,
    "q":        req.query.q,
  }
  let query = getQuery(req.path, query_params)
  request(query, function (error, response, body) {
    let json  = JSON.parse(body)
    let obj   = { list: getMostPresentWeatherIdsByDay(json.list) }
    res.set('Content-Type', 'application/json');
    res.send(obj)
  })
})

app.get('/weather', function (req, res) {
  let query_params = {
    "appid":   API_KEY,
    "units":    req.query.units,
    "q":        req.query.q,
  }
  let query = getQuery(req.path, query_params)

  request(query, function (error, response, body) {
    let json = JSON.parse(body)
    let obj = extractWeatherChunk(json)
    res.set('Content-Type', 'application/json');
    res.send(obj)
  })
})

app.listen(PORT, function () {
  console.log(`Example app listening on port ${PORT}`)
})