import { APIResponse } from "types/response";
import { Server, Settings } from "types/server";
import { processResponse } from "util/response";

export const fetchSettings = (): Promise<Settings> => {
  return new Promise((resolve, reject) => {
    fetch(`/1.0`)
      .then((response) => response.json())
      .then((data) => resolve(data.metadata))
      .catch(reject);
  });
};

export const fetchServers = (): Promise<Server[]> => {
  return new Promise((resolve, reject) => {
    fetch(`/1.0/provisioning/servers?recursion=1`)
      .then(processResponse)
      .then((data) => resolve(data.metadata))
      .catch(reject);
  });
};

export const fetchServer = (name: string): Promise<Server> => {
  return new Promise((resolve, reject) => {
    fetch(`/1.0/provisioning/servers/${name}`)
      .then((response) => response.json())
      .then((data) => resolve(data.metadata))
      .catch(reject);
  });
};

export const deleteServer = (name: string): Promise<APIResponse<object>> => {
  return new Promise((resolve, reject) => {
    fetch(`/1.0/provisioning/servers/${name}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((data) => resolve(data))
      .catch(reject);
  });
};

export const renameServer = (
  name: string,
  body: string,
): Promise<APIResponse<null>> => {
  return new Promise((resolve, reject) => {
    fetch(`/1.0/provisioning/servers/${name}`, {
      method: "POST",
      body: body,
    })
      .then((response) => response.json())
      .then((data) => resolve(data))
      .catch(reject);
  });
};
