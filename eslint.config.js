import { configApp } from '@adonisjs/eslint-config'
import perfectionist from 'eslint-plugin-perfectionist'

export default configApp(perfectionist.configs['recommended-natural'])
