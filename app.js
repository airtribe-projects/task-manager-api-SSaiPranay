const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
const port = 3000

app.use(express.json())

const filePath = path.join(__dirname, 'task.json')

function readTasksFromFile() {
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data).tasks
}

function writeTasksToFile(tasks) {
  fs.writeFileSync(filePath, JSON.stringify({ tasks }, null, 2), 'utf-8')
}

function getNextId(tasks) {
  return tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1
}

function isValidTaskInput(body, checkAllFields = true) {
  const { title, description, completed, priority } = body
  const validPriorities = ['low', 'medium', 'high']

  if (checkAllFields) {
    if (typeof title !== 'string' || title.trim() === '') return 'Title is required and must be a non-empty string'
    if (typeof description !== 'string' || description.trim() === '') return 'Description is required and must be a non-empty string'
    if (typeof completed !== 'boolean') return 'Completed must be a boolean'
    if (!validPriorities.includes(priority)) return 'Priority must be one of: low, medium, high'
  } else {
    if ('title' in body && (typeof title !== 'string' || title.trim() === '')) return 'Title must be a non-empty string'
    if ('description' in body && (typeof description !== 'string' || description.trim() === '')) return 'Description must be a non-empty string'
    if ('completed' in body && typeof completed !== 'boolean') return 'Completed must be a boolean'
    if ('priority' in body && !validPriorities.includes(priority)) return 'Priority must be one of: low, medium, high'
  }

  return null
}

app.get('/tasks', (req, res) => {
  let tasks = readTasksFromFile()
  let filteredTasks = [...tasks]

  if ('completed' in req.query) {
    const status = req.query.completed === 'true'
    filteredTasks = filteredTasks.filter(t => t.completed === status)
  }

  filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(filteredTasks)
})

app.get('/tasks/:id', (req, res) => {
  const tasks = readTasksFromFile()
  const task = tasks.find(t => t.id === parseInt(req.params.id))
  if (!task) return res.status(404).json({ message: 'Task not found' })
  res.json(task)
})

app.get('/tasks/priority/:level', (req, res) => {
  const tasks = readTasksFromFile()
  const { level } = req.params
  const validPriorities = ['low', 'medium', 'high']
  if (!validPriorities.includes(level)) {
    return res.status(400).json({ message: 'Invalid priority level' })
  }

  const filtered = tasks.filter(t => t.priority === level)
  res.json(filtered)
})

app.post('/tasks', (req, res) => {
  const tasks = readTasksFromFile()
  const error = isValidTaskInput(req.body)
  if (error) return res.status(400).json({ message: error })

  const { title, description, completed, priority } = req.body

  const newTask = {
    id: getNextId(tasks),
    title: title.trim(),
    description: description.trim(),
    completed,
    priority,
    createdAt: new Date().toISOString()
  }

  tasks.push(newTask)
  writeTasksToFile(tasks)
  res.status(201).json(newTask)
})

app.put('/tasks/:id', (req, res) => {
  const tasks = readTasksFromFile()
  const task = tasks.find(t => t.id === parseInt(req.params.id))
  if (!task) return res.status(404).json({ message: 'Task not found' })

  const error = isValidTaskInput(req.body, false)
  if (error) return res.status(400).json({ message: error })

  const { title, description, completed, priority } = req.body

  if (title) task.title = title.trim()
  if (description) task.description = description.trim()
  if (typeof completed === 'boolean') task.completed = completed
  if (priority) task.priority = priority

  writeTasksToFile(tasks)
  res.json(task)
})

app.delete('/tasks/:id', (req, res) => {
  let tasks = readTasksFromFile()
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id))
  if (index === -1) return res.status(404).json({ message: 'Task not found' })

  const deleted = tasks.splice(index, 1)
  writeTasksToFile(tasks)
  res.json({ message: 'Task deleted', task: deleted[0] })
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
