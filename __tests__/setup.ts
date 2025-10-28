import { beforeAll, afterEach, afterAll } from "vitest"
import { cleanup } from "@testing-library/react"
import { server } from "./mocks/server"

// Start server before all tests
beforeAll(() => server.listen())

// Reset handlers after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Clean up after all tests
afterAll(() => server.close())
