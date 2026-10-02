export const jsonOrThrow = async (response: Response, label: string): Promise<unknown> => {
  if (!response.ok) {
    throw new Error(`${label} ${response.status}: ${await response.text()}`)
  }

  return response.json()
}
