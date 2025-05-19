export default function validateAttributes(attributes, keys) {
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (attributes[key] === undefined) throw new Error(`Missing attribute ${key}.Attributes ${JSON.stringify(attributes)}`);
  }
}
