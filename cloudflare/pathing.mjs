export const BASE_PATH = '/monopolyThaithinh';

export function resolveAppPath(pathname) {
  if (pathname === BASE_PATH) {
    return { basePath: BASE_PATH, pathname: '/', redirectPath: `${BASE_PATH}/` };
  }
  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return { basePath: BASE_PATH, pathname: pathname.slice(BASE_PATH.length), redirectPath: null };
  }
  return { basePath: '', pathname, redirectPath: null };
}
