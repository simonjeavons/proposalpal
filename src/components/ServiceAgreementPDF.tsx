import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const SHOOTHILL_LOGO_URI =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMTMzLjA3MiIgdmlld0JveD0iMCAwIDUwMCAxMzMuMDcyIj48ZyBpZD0iR3JvdXBfMTAyMTEiIGRhdGEtbmFtZT0iR3JvdXAgMTAyMTEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC02MjIgLTc3Ny43NTIpIj48ZyBpZD0iR3JvdXBfOTkzMiIgZGF0YS1uYW1lPSJHcm91cCA5OTMyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2MjIgNzc3Ljc1MikiPjxwYXRoIGlkPSJQYXRoXzE1NDQ4IiBkYXRhLW5hbWU9IlBhdGggMTU0NDgiIGQ9Ik00MC40NjgsMjAuNDE2QTM4LjY5LDM4LjY5LDAsMCwxLDczLjM2LDUzLjE1YS41NjUuNTY1LDAsMCwwLC41Ni40ODVoOS4yNThhLjU2NC41NjQsMCwwLDAsLjU2Mi0uNjMsNDkuMTYzLDQ5LjE2MywwLDAsMC00My4xMzMtNDIuOTcuNTY2LjU2NiwwLDAsMC0uNjI4LjU2MnY5LjI1OGEuNTY3LjU2NywwLDAsMCwuNDg5LjU2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMS41ODUgNy45MjYpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NDkiIGRhdGEtbmFtZT0iUGF0aCAxNTQ0OSIgZD0iTTUzLjMxNCwxMC4wMzZBNDkuMTcsNDkuMTcsMCwwLDAsMTAuMTgsNTMuMDA2YS41NjkuNTY5LDAsMCwwLC41NjQuNjMySDIwYS41NjUuNTY1LDAsMCwwLC41Ni0uNDg3QTM4LjY5MiwzOC42OTIsMCwwLDEsNTMuNDU0LDIwLjQxNmEuNTY1LjU2NSwwLDAsMCwuNDg5LS41NlYxMC42YS41NjYuNTY2LDAsMCwwLS42MjgtLjU2NCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOC4wNCA3LjkyNSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MCIgZGF0YS1uYW1lPSJQYXRoIDE1NDUwIiBkPSJNODMuNjQ1LDM5LjkzMmEuNTY2LjU2NiwwLDAsMC0uNDIxLS4xODhINzMuOTY3YS41NjYuNTY2LDAsMCwwLS41NjIuNDkyLDM4LjYyNywzOC42MjcsMCwwLDEtMzIuOTM3LDMzLjEuNTY1LjU2NSwwLDAsMC0uNDg5LjU2djkuMjU2YS41NjcuNTY3LDAsMCwwLC4xODguNDIyLjU3My41NzMsMCwwLDAsLjM3OC4xNDVjLjAyMSwwLC4wNDEsMCwuMDYzLDBBNDkuMTA1LDQ5LjEwNSwwLDAsMCw4My43ODcsNDAuMzcxYS41NjQuNTY0LDAsMCwwLS4xNDEtLjQzOSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEuNTg1IDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MSIgZGF0YS1uYW1lPSJQYXRoIDE1NDUxIiBkPSJNNTMuNDczLDczLjMzMWEzOC42MjUsMzguNjI1LDAsMCwxLTMyLjkzOS0zMy4xLjU2Ny41NjcsMCwwLDAtLjU2Mi0uNDkySDEwLjcxOGEuNTY2LjU2NiwwLDAsMC0uNTY0LjYyN0E0OS4xLDQ5LjEsMCwwLDAsNTMuMzM0LDgzLjcxMmMuMDIxLDAsLjA0MSwwLC4wNjMsMGEuNTY2LjU2NiwwLDAsMCwuNTY2LS41NjZWNzMuODkyYS41NjcuNTY3LDAsMCwwLS40ODktLjU2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4LjAyIDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MiIgZGF0YS1uYW1lPSJQYXRoIDE1NDUyIiBkPSJNNDAuNTQ1LDU3LjA1MmEuNTg4LjU4OCwwLDAsMCwuMTM2LS4wMTZBMjIuNjg0LDIyLjY4NCwwLDAsMCw1Ny4yNjksNDAuNDQ3YS41NjguNTY4LDAsMCwwLS41NS0uN2gtOC4wMWEuNTY3LjU2NywwLDAsMC0uNTI2LjM1OCwxNC4wNzQsMTQuMDc0LDAsMCwxLTcuODQ4LDcuODQ4LjU2Ni41NjYsMCwwLDAtLjM1Ni41MjZ2OC4wMWEuNTY0LjU2NCwwLDAsMCwuNTY2LjU2NiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEuNTg1IDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MyIgZGF0YS1uYW1lPSJQYXRoIDE1NDUzIiBkPSJNNDAuMzM2LDMzLjgyNGExNC4wNzksMTQuMDc5LDAsMCwxLDcuODQ4LDcuODQ4LjU2NS41NjUsMCwwLDAsLjUyNi4zNThoOC4wMWEuNTY3LjU2NywwLDAsMCwuNTUtLjcsMjIuNjg0LDIyLjY4NCwwLDAsMC0xNi41ODgtMTYuNTkuNTc5LjU3OSwwLDAsMC0uNDg1LjEwNi41NjYuNTY2LDAsMCwwLS4yMTguNDQ2VjMzLjNhLjU2OC41NjgsMCwwLDAsLjM1OC41MjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMxLjU4NCAxOS41MzIpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NTQiIGRhdGEtbmFtZT0iUGF0aCAxNTQ1NCIgZD0iTTQxLjkwOCw0Ny45NDlBMTQuMDY5LDE0LjA2OSwwLDAsMSwzNC4wNjEsNDAuMWEuNTcyLjU3MiwwLDAsMC0uNTI4LS4zNThIMjUuNTI0YS41NjguNTY4LDAsMCwwLS41NS43QTIyLjY3OSwyMi42NzksMCwwLDAsNDEuNTYzLDU3LjAzNWEuNTg3LjU4NywwLDAsMCwuMTM2LjAxNi41NjcuNTY3LDAsMCwwLC41NjctLjU2NnYtOC4wMWEuNTY4LjU2OCwwLDAsMC0uMzU4LS41MjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE5LjcxNyAzMS4zOTkpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NTUiIGRhdGEtbmFtZT0iUGF0aCAxNTQ1NSIgZD0iTTQxLjU2MywyNC43NEEyMi42NzYsMjIuNjc2LDAsMCwwLDI0Ljk3NSw0MS4zMjhhLjU2OC41NjgsMCwwLDAsLjU1LjdoOC4wMDlhLjU2NS41NjUsMCwwLDAsLjUyNi0uMzU4LDE0LjA3MiwxNC4wNzIsMCwwLDEsNy44NDktNy44NDguNTcyLjU3MiwwLDAsMCwuMzU4LS41MjhWMjUuMjg5YS41NjguNTY4LDAsMCwwLS43LS41NSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTkuNzE3IDE5LjUzMikiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1NiIgZGF0YS1uYW1lPSJQYXRoIDE1NDU2IiBkPSJNNDAuMzM0LDY2LjY2SDM2LjNhLjI3OC4yNzgsMCwwLDAtLjI3Ny4yNzdWNzguMTEzYTIuMywyLjMsMCwwLDAsNC41OTEsMFY2Ni45MzdhLjI3OS4yNzksMCwwLDAtLjI3Ny0uMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyOC40NTcgNTIuNjY0KSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU3IiBkYXRhLW5hbWU9IlBhdGggMTU0NTciIGQ9Ik0xMy43NDgsNDAuMlYzNi4xNjVhLjI3OC4yNzgsMCwwLDAtLjI3Ny0uMjc3SDIuMjk1YTIuMywyLjMsMCwwLDAsMCw0LjU5MUgxMy40N2EuMjc5LjI3OSwwLDAsMCwuMjc3LS4yNzciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjguMzUzKSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU4IiBkYXRhLW5hbWU9IlBhdGggMTU0NTgiIGQ9Ik02Ni42Niw0MC4yVjM2LjE2NWEuMjc4LjI3OCwwLDAsMSwuMjc3LS4yNzdINzguMTEzYTIuMywyLjMsMCwwLDEsMCw0LjU5MUg2Ni45MzdhLjI3OS4yNzksMCwwLDEtLjI3Ny0uMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1Mi42NjQgMjguMzUzKSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU5IiBkYXRhLW5hbWU9IlBhdGggMTU0NTkiIGQ9Ik0zNi4zLDEzLjc0OGg0LjAzN2EuMjc4LjI3OCwwLDAsMCwuMjc3LS4yNzdWMi4yOTVhMi4zLDIuMywwLDAsMC00LjU5MSwwVjEzLjQ3YS4yNzkuMjc5LDAsMCwwLC4yNzcuMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyOC40NTcpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PC9nPjxnIGlkPSJHcm91cF85OTMzIiBkYXRhLW5hbWU9Ikdyb3VwIDk5MzMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDc3OC45NjEgODExLjA2OCkiPjxnIGlkPSJHcm91cF85OTM1IiBkYXRhLW5hbWU9Ikdyb3VwIDk5MzUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMS4xMDMpIj48cGF0aCBpZD0iUGF0aF8xNTQ2MCIgZGF0YS1uYW1lPSJQYXRoIDE1NDYwIiBkPSJNMTI0LjEzMSwzOC4yNThhNy44MDYsNy44MDYsMCwwLDAtMy4xNzctNS44LDEyLjYsMTIuNiwwLDAsMC03LjYxNy0yLjA2NiwxNC43NzQsMTQuNzc0LDAsMCwwLTUuNTIyLjkwOSw3Ljc1NSw3Ljc1NSwwLDAsMC0zLjQzNywyLjUxMyw1Ljk0Miw1Ljk0MiwwLDAsMC0xLjE4NywzLjYzOSw1LjEsNS4xLDAsMCwwLC43MjMsMi45NjMsNy4wODUsNy4wODUsMCwwLDAsMi4xNzMsMi4xNzMsMTUuNCwxNS40LDAsMCwwLDMuMjEsMS41NzIsMzAuOTk0LDMwLjk5NCwwLDAsMCwzLjg4NCwxLjEyOGw1LjY3NCwxLjM1N2EzOS45ODksMzkuOTg5LDAsMCwxLDcuNTg4LDIuNDY3LDIzLjA4MywyMy4wODMsMCwwLDEsNS45ODIsMy43OTMsMTUuOTQ5LDE1Ljk0OSwwLDAsMSwzLjkzMyw1LjMwNiwxNi45MjEsMTYuOTIxLDAsMCwxLDEuNDM2LDcsMTcuNDY5LDE3LjQ2OSwwLDAsMS0yLjk0NiwxMC4wMzksMTguNzc1LDE4Ljc3NSwwLDAsMS04LjM5LDYuNTY5LDMzLjYxMywzMy42MTMsMCwwLDEtMTMuMTg0LDIuMzI5LDM0LjY0OSwzNC42NDksMCwwLDEtMTMuMzA3LTIuMzQzLDE5LjM4OSwxOS4zODksMCwwLDEtOC44MjEtNi45NTQsMjAuNTgsMjAuNTgsMCwwLDEtMy4zMTUtMTEuNDI4aDEyLjkyMmE5LjU1OCw5LjU1OCwwLDAsMCwxLjgzNSw1LjI5LDkuODM2LDkuODM2LDAsMCwwLDQuMzQ4LDMuMTc2LDE2LjksMTYuOSwwLDAsMCw2LjE4MywxLjA2NSwxNi4xMzMsMTYuMTMzLDAsMCwwLDUuOTA3LS45ODYsOS4wMzEsOS4wMzEsMCwwLDAsMy45LTIuNzQ2LDYuMzI5LDYuMzI5LDAsMCwwLDEuMzg5LTQuMDQsNS4yOTEsNS4yOTEsMCwwLDAtMS4yNDktMy41NzgsOS43MzIsOS43MzIsMCwwLDAtMy42MzktMi40NjcsMzcuNDY2LDM3LjQ2NiwwLDAsMC01Ljg0NC0xLjg1MWwtNi44NzctMS43MjdxLTcuOTkxLTEuOTQ0LTEyLjYxNC02LjA3NVQ4OS41LDM4LjM1MWExNi41LDE2LjUsMCwwLDEsMy4wNjgtMTAuMDI0LDIwLjQ5MiwyMC40OTIsMCwwLDEsOC41My02LjY5MywzMC4xNjgsMzAuMTY4LDAsMCwxLDEyLjMzMy0yLjQwNiwyOS4zMjYsMjkuMzI2LDAsMCwxLDEyLjI5NCwyLjQwNiwxOS40MzksMTkuNDM5LDAsMCwxLDguMTg2LDYuNjkzLDE3LjcwNiwxNy43MDYsMCwwLDEsMy4wMjMsOS45MzFaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtODcuODMxIC0xOS4yMjgpIiBmaWxsPSIjMzMzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NjEiIGRhdGEtbmFtZT0iUGF0aCAxNTQ2MSIgZD0iTTEzMC42NjQsNTUuNDg3VjgyLjg3NEgxMTcuNTI3VjE5LjcxMWgxMi43NjdWNDMuODZoLjU1NWExMy40ODksMTMuNDg5LDAsMCwxLDUuMTgyLTYuNTg2LDE1LjgyNCwxNS44MjQsMCwwLDEsOC45NzUtMi4zOSwxNi44NTYsMTYuODU2LDAsMCwxLDguNjIxLDIuMTQzLDE0LjY4MSwxNC42ODEsMCwwLDEsNS43MzUsNi4xMzgsMjAuNDQyLDIwLjQ0MiwwLDAsMSwyLjAxOSw5LjU0NlY4Mi44NzRIMTQ4LjI0NFY1NS4wNTVhOS42MTYsOS42MTYsMCwwLDAtMi4yMDUtNi44MTYsOC4wNTcsOC4wNTcsMCwwLDAtNi4yNDUtMi40MzQsOS41ODUsOS41ODUsMCwwLDAtNC43MzYsMS4xNCw4LjAxMiw4LjAxMiwwLDAsMC0zLjIwNiwzLjMxNSwxMS4yMjYsMTEuMjI2LDAsMCwwLTEuMTg3LDUuMjI3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNjQuMzcgLTE4Ljg0NikiIGZpbGw9IiMzMzMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ2MiIgZGF0YS1uYW1lPSJQYXRoIDE1NDYyIiBkPSJNMjI1LjA4NSw3MC41NTJjLS4zMzEuMDYzLS44LjE1LTEuNDE4LjI2M2ExMC4yOCwxMC4yOCwwLDAsMS0xLjg1My4xNyw2LjIxMiw2LjIxMiwwLDAsMS0yLjMyNy0uNCwzLjAyLDMuMDIsMCwwLDEtMS41NTctMS40LDUuODg0LDUuODg0LDAsMCwxLS41NTUtMi44MjFWNDMuNDExaDguOTExdi05Ljg3aC04LjkxMVYyMi4xOTJIMjA0LjIzNFYzMy41NDFoLTYuNDc2djkuODdoNi40NzZWNjguMDg1YTEzLjc2MSwxMy43NjEsMCwwLDAsMS45NDYsNy43MSwxMS42MTEsMTEuNjExLDAsMCwwLDUuNTM1LDQuNSwxOS45MTcsMTkuOTE3LDAsMCwwLDguMzEzLDEuMjY0LDIzLjE3NSwyMy4xNzUsMCwwLDAsNC4zNDgtLjUwOHExLjc4OC0uNDE2LDIuNzc2LS43MjdaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC45ODQgLTE2Ljg4NikiIGZpbGw9IiMzMzMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ2MyIgZGF0YS1uYW1lPSJQYXRoIDE1NDYzIiBkPSJNMjI4Ljc2Myw1NS40ODdWODIuODc0SDIxNS42MjZWMTkuNzExaDEyLjc2N1Y0My44NmguNTU1YTEzLjQ4OSwxMy40ODksMCwwLDEsNS4xODItNi41ODYsMTUuODI0LDE1LjgyNCwwLDAsMSw4Ljk3NS0yLjM5LDE2Ljg1NiwxNi44NTYsMCwwLDEsOC42MjEsMi4xNDMsMTQuNjgyLDE0LjY4MiwwLDAsMSw1LjczNSw2LjEzOCwyMC40NDIsMjAuNDQyLDAsMCwxLDIuMDE5LDkuNTQ2VjgyLjg3NEgyNDYuMzQzVjU1LjA1NWE5LjYxNiw5LjYxNiwwLDAsMC0yLjIwNS02LjgxNiw4LjA1Nyw4LjA1NywwLDAsMC02LjI0NS0yLjQzNCw5LjU4NSw5LjU4NSwwLDAsMC00LjczNiwxLjE0LDcuOTkxLDcuOTkxLDAsMCwwLTMuMjA2LDMuMzE1LDExLjIyNSwxMS4yMjUsMCwwLDAtMS4xODcsNS4yMjciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzLjEzMiAtMTguODQ2KSIgZmlsbD0iIzMzMyI+PC9wYXRoPjxyZWN0IGlkPSJSZWN0YW5nbGVfMzMwNCIgZGF0YS1uYW1lPSJSZWN0YW5nbGUgMzMwNCIgd2lkdGg9IjEzLjEzNyIgaGVpZ2h0PSI0Ny4zNzMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI3Ni44NDQgMTYuNjU3KSIgZmlsbD0iIzMzMyI+PC9yZWN0PjxyZWN0IGlkPSJSZWN0YW5nbGVfMzMwNSIgZGF0YS1uYW1lPSJSZWN0YW5nbGUgMzMwNSIgd2lkdGg9IjEzLjEzNyIgaGVpZ2h0PSI2My4xNjMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI5NC4zMzcgMC44NjUpIiBmaWxsPSIjMzMzIj48L3JlY3Q+PHJlY3QgaWQ9IlJlY3RhbmdsZV8zMzA2IiBkYXRhLW5hbWU9IlJlY3RhbmdsZSAzMzA2IiB3aWR0aD0iMTMuMTM3IiBoZWlnaHQ9IjYzLjE2MyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzExLjgyNSAwLjg2NSkiIGZpbGw9IiMzMzMiPjwvcmVjdD48cGF0aCBpZD0iUGF0aF8xNTQ2NCIgZGF0YS1uYW1lPSJQYXRoIDE1NDY0IiBkPSJNMjIwLjA0LDI4LjAwN2EyMy42MiwyMy42MiwwLDAsMC05LjY1NCwyLjA2MiwyNC41LDI0LjUsMCwwLDAtNy4wNDcsNC43NDVsLS4wMTYtLjAyTDE3Ni41NDUsNjJhMTMuMjU5LDEzLjI1OSwwLDAsMS05LjEsMy44ODgsMTMuMDM2LDEzLjAzNiwwLDAsMSwwLTI2LjA2OCwxMi42MTYsMTIuNjE2LDAsMCwxLDguMzI3LDMuMTc3bC4yLjIsOC4xMTMsOC4xNDYsOC4yNDgtOC4zNzktNy4wNjItNy4wMzgtMS4xMjEtMS4xYTI0LjUsMjQuNSwwLDAsMC03LjA0Ny00Ljc0NSwyMy42MiwyMy42MiwwLDAsMC05LjY1NC0yLjA2MiwyNC44NDcsMjQuODQ3LDAsMCwwLDAsNDkuNjg2LDIzLjg2NiwyMy44NjYsMCwwLDAsOS41OTEtMiwyNC4zLDI0LjMsMCwwLDAsNy4xMTUtNC43MzNMMjEwLjA2LDQ0LjcxbDEuNjI3LTEuNjkzYTEyLjYzMywxMi42MzMsMCwwLDEsOC4zNTItMy4yLDEzLjAzNywxMy4wMzcsMCwwLDEsMCwyNi4wNjgsMTIsMTIsMCwwLDEtOC45Ny0zLjc1NmwtNy44LTcuOTQyLTguMjUsOC4zODEsOC4zMjcsOC40YTI0LjM4MywyNC4zODMsMCwwLDAsNy4xLDQuNzI0LDIzLjg3NSwyMy44NzUsMCwwLDAsOS41OTMsMiwyNC44NDcsMjQuODQ3LDAsMCwwLDAtNDkuNjg2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDQuMjExIC0xMi4yOTIpIiBmaWxsPSIjMzMzIj48L3BhdGg+PC9nPjxwYXRoIGlkPSJQYXRoXzE1NDY1IiBkYXRhLW5hbWU9IlBhdGggMTU0NjUiIGQ9Ik0yNDkuMDQ5LDMxLjY5M2E2LjU3Myw2LjU3MywwLDAsMS02LjU0OC02LjU1NSw2LjU0OSw2LjU0OSwwLDEsMSwxMS4xNzUsNC42MjcsNi4zLDYuMywwLDAsMS00LjYyNywxLjkyOCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzQuNjI2IC0xOC42MTEpIiBmaWxsPSIjMzMzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NjYiIGRhdGEtbmFtZT0iUGF0aCAxNTQ2NiIgZD0iTTI3OC41NTcsMzEuNjkyYTYuNDEzLDYuNDEzLDAsMCwxLTIuNTQ0LS41LDYuNiw2LjYsMCwwLDEtMy40OTEtMy40OTIsNi42MzUsNi42MzUsMCwwLDEsMC01LjA4Niw2LjYsNi42LDAsMCwxLDMuNDkxLTMuNDkxLDYuNjM1LDYuNjM1LDAsMCwxLDUuMDg1LDAsNi41OTQsNi41OTQsMCwwLDEsMy40ODksMy40OTEsNi42MTMsNi42MTMsMCwwLDEsMCw1LjA4Niw2LjUzLDYuNTMsMCwwLDEtMS40MDUsMi4wODUsNi42MTcsNi42MTcsMCwwLDEtMi4wODQsMS40MDcsNi40MjQsNi40MjQsMCwwLDEtMi41NDIuNW0wLTEuNTY4YTQuNzg4LDQuNzg4LDAsMCwwLDIuNS0uNjcxLDUuMDYyLDUuMDYyLDAsMCwwLDEuOC0xLjgsNC45ODksNC45ODksMCwwLDAsMC01LDUuMDY3LDUuMDY3LDAsMCwwLTEuOC0xLjgsNS4wMDUsNS4wMDUsMCwwLDAtNSwwLDUuMDgsNS4wOCwwLDAsMC0xLjgsMS44LDUuMDExLDUuMDExLDAsMCwwLDAsNSw1LjA3NSw1LjA3NSwwLDAsMCwxLjgsMS44LDQuOCw0LjgsMCwwLDAsMi41LjY3MW0tMi4yOS0yLjAyOFYyMi4wNjFoMy4wNTdhMS44NTYsMS44NTYsMCwwLDEsLjguMjA5LDEuOTU5LDEuOTU5LDAsMCwxLC43NDEuNjM3LDEuODI0LDEuODI0LDAsMCwxLC4zLDEuMDg1LDEuOTQyLDEuOTQyLDAsMCwxLS4zMTcsMS4xMjQsMi4xNTUsMi4xNTUsMCwwLDEtLjc3My43LDEuODU4LDEuODU4LDAsMCwxLS44NTQuMjM2aC0yLjIwN3YtLjk3OWgxLjhhLjkzNy45MzcsMCwwLDAsLjU4NS0uMjcsMS4wMDksMS4wMDksMCwwLDAsLjMxNS0uODA5LjgxOS44MTksMCwwLDAtLjMxNS0uNzU0LDEuMDgzLDEuMDgzLDAsMCwwLS41NTEtLjJoLTEuMjU4VjI4LjFabTMuNjQ1LTIuODQ0LDEuNSwyLjg0NGgtMS40NTNsLTEuNDcxLTIuODQ0WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTcuOTQ0IC0xOC42MTIpIiBmaWxsPSIjMzMzIj48L3BhdGg+PC9nPjwvZz48L3N2Zz4g';
import type { Phase, RetainerOption, UpfrontItem } from '@/types/proposal';

interface TemplateSection {
  heading: string;
  body: string;
}

export interface ServiceAgreementPDFProps {
  // Dynamic — from proposal + customer selections
  clientName: string;
  organisation: string;
  programmeTitle: string;
  agreementDate: string;
  phases: Phase[];
  upfrontItems: UpfrontItem[];
  selectedStandard: RetainerOption | null;
  selectedExtras: RetainerOption[];
  upfrontTotal: number;
  monthlyTotal: number;
  firstYearTotal: number;
  paymentTerms: string;
  contactName: string;
  contactEmail: string;
  // Static — from chosen template
  templateSections: TemplateSection[];
}

const NAVY = '#043D5D';
const BLUE = '#009FE3';
const MID = '#3A6278';
const LIGHT = '#AAAAAA';
const BG = '#F4F7FA';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
    paddingTop: 48,
    paddingBottom: 56,
    paddingLeft: 56,
    paddingRight: 56,
  },
  // Header
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 56,
    paddingRight: 56,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
  },
  headerLogo: {
    height: 28,
    width: 105,
  },
  headerSub: {
    fontSize: 10,
    color: MID,
  },
  accentStripe: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: BLUE,
  },
  // Sections
  sectionHeader: {
    backgroundColor: '#E8F4FB',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 6,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  sectionBody: {
    fontSize: 9,
    color: '#222222',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  // Meta table
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    width: 120,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 9,
    color: '#111111',
    flex: 1,
  },
  // Charges table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
    paddingVertical: 4,
  },
  tableRowBold: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: NAVY,
    paddingVertical: 4,
    marginTop: 2,
  },
  tableDesc: {
    flex: 1,
    fontSize: 9,
    color: '#222222',
  },
  tableDescBold: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  tableAmt: {
    fontSize: 9,
    color: '#222222',
    textAlign: 'right',
    width: 100,
  },
  tableAmtBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'right',
    width: 100,
  },
  // Execution
  execRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
  },
  execCol: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#DDE8EE',
    paddingTop: 8,
  },
  execLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  execLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
    marginBottom: 10,
    paddingBottom: 16,
  },
  execLineLabel: {
    fontSize: 7,
    color: LIGHT,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: '#DDE8EE',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: LIGHT,
  },
  spacer: { height: 8 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#DDE8EE', marginVertical: 8 },
  partiesText: { fontSize: 9, color: '#222222', lineHeight: 1.5, marginBottom: 6 },
});

const fmt = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const optionTotal = (r: RetainerOption) => (r.quantity ?? 1) * r.price;

export function ServiceAgreementPDF({
  clientName,
  organisation,
  programmeTitle,
  agreementDate,
  phases,
  upfrontItems,
  selectedStandard,
  selectedExtras,
  upfrontTotal,
  monthlyTotal,
  firstYearTotal,
  paymentTerms,
  contactName,
  contactEmail,
  templateSections,
}: ServiceAgreementPDFProps) {
  const entityName = organisation || clientName;

  return (
    <Document title={`Service Agreement — ${entityName}`} author="Shoothill Limited">
      <Page size="A4" style={styles.page}>
        {/* Fixed header */}
        <View style={styles.headerBar} fixed>
          <Image src={SHOOTHILL_LOGO_URI} style={styles.headerLogo} />
          <Text style={styles.headerSub}>Service Agreement</Text>
        </View>
        <View style={styles.accentStripe} fixed />

        {/* Top spacer to clear fixed header */}
        <View style={{ height: 20 }} />

        {/* Agreement meta */}
        <View style={{ marginBottom: 12 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Agreement Date</Text>
            <Text style={styles.metaValue}>{agreementDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Client</Text>
            <Text style={styles.metaValue}>{entityName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Programme</Text>
            <Text style={styles.metaValue}>{programmeTitle}</Text>
          </View>
          {selectedStandard?.term_months && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Initial Term</Text>
              <Text style={styles.metaValue}>{selectedStandard.term_months} months</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 7, color: LIGHT, marginBottom: 10 }}>
          Shoothill Ltd · Willow House East, Shrewsbury Business Park, SY2 6LG · Company No. 05885234
        </Text>
        <View style={styles.divider} />

        {/* Parties */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Parties</Text>
        </View>
        <Text style={styles.partiesText}>
          This Agreement is made between: (1) SHOOTHILL LIMITED, a company incorporated in England and Wales with registered number 05885234 whose registered office is at Willow House East, Shrewsbury Business Park, Shrewsbury, England, SY2 6LG (the "Supplier"); and (2) {entityName} (the "Customer"). Together referred to as the "Parties".
        </Text>

        {/* Schedule 1 — Scope */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Schedule 1 — Scope of Work</Text>
        </View>
        {phases.length > 0 ? (
          phases.map((phase, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY }}>
                {phase.label}{phase.title ? `: ${phase.title}` : ''}{phase.duration ? `  (${phase.duration})` : ''}{phase.price ? `  — ${phase.price.startsWith('£') ? phase.price : `£${phase.price}`}` : ''}
              </Text>
              {phase.tasks.filter(Boolean).map((task, j) => (
                <Text key={j} style={{ fontSize: 8, color: MID, paddingLeft: 12 }}>• {task}</Text>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.sectionBody}>{programmeTitle} — services as described in the Supplier's Proposal.</Text>
        )}

        {/* Schedule 2 — Charges */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Schedule 2 — Charges and Payment Terms</Text>
        </View>

        {/* Upfront items */}
        {upfrontItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableDesc}>{item.name || item.type}</Text>
            <Text style={styles.tableAmt}>{fmt(item.price)} + VAT</Text>
          </View>
        ))}
        {upfrontItems.length > 0 && (
          <View style={styles.tableRowBold}>
            <Text style={styles.tableDescBold}>One-Time Project Total</Text>
            <Text style={styles.tableAmtBold}>{fmt(upfrontTotal)} + VAT</Text>
          </View>
        )}

        {/* Monthly — shown if any ongoing items are present */}
        {(selectedStandard || selectedExtras.length > 0) && (
          <>
            <View style={{ height: 6 }} />
            {selectedStandard && (
              <View style={styles.tableRow}>
                <Text style={styles.tableDesc}>{selectedStandard.name || selectedStandard.type} /month{selectedStandard.term_months ? ` (${selectedStandard.term_months} months)` : ''}</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(selectedStandard))} + VAT/month</Text>
              </View>
            )}
            {selectedExtras.map((extra, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableDesc}>{extra.name || extra.type} /month{extra.term_months ? ` (${extra.term_months} months)` : ''}</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(extra))} + VAT/month</Text>
              </View>
            ))}
            <View style={styles.tableRowBold}>
              <Text style={styles.tableDescBold}>Monthly Support Total</Text>
              <Text style={styles.tableAmtBold}>{fmt(monthlyTotal)} + VAT/month</Text>
            </View>
            <View style={{ height: 4 }} />
            <View style={styles.tableRowBold}>
              <Text style={styles.tableDescBold}>First Year Total</Text>
              <Text style={styles.tableAmtBold}>{fmt(firstYearTotal)} + VAT</Text>
            </View>
          </>
        )}

        {paymentTerms ? (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: BG }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Payment Terms</Text>
            <Text style={{ fontSize: 9, color: '#222222' }}>{paymentTerms}</Text>
          </View>
        ) : null}

        {/* Template sections (legal clauses) */}
        {templateSections.map((section, i) => (
          <View key={i} wrap={false} style={{ marginTop: 2 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Execution block */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Execution</Text>
        </View>
        <Text style={{ fontSize: 9, color: '#222222', marginBottom: 10 }}>
          IN WITNESS WHEREOF the parties have signed this Agreement on {agreementDate}.
        </Text>
        <View style={styles.execRow}>
          <View style={styles.execCol}>
            <Text style={styles.execLabel}>For Shoothill Limited</Text>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Authorised Signatory</Text></View>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Print Name</Text></View>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Date</Text></View>
          </View>
          <View style={styles.execCol}>
            <Text style={styles.execLabel}>For {entityName}</Text>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Authorised Signatory</Text></View>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Print Name</Text></View>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Date</Text></View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Shoothill Ltd · {contactName} · {contactEmail}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
