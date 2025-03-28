/// <reference types="react-scripts" />
declare module 'process' {
  global {
    namespace NodeJS {
      interface Process {}
    }
  }
}