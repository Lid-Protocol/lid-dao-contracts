const { hash: namehash } = require("eth-ens-namehash");

const BASE_APPS = [
  { name: "agent", contractName: "Agent" },
  { name: "voting", contractName: "Voting" }
];

const LID_APPS = [
  {
    name: "lidvotingrightsgrantee",
    contractName: "LidVotingRightsGrantee"
  }
];

const BASE_APP_IDS = BASE_APPS.reduce((ids, { name }) => {
  ids[name] = namehash(`${name}.aragonpm.eth`);
  return ids;
}, {});

const LID_APP_IDS = LID_APPS.reduce((ids, { name }) => {
  ids[name] = namehash(`${name}.open.aragonpm.eth`);
  return ids;
}, {});

module.exports = {
  APPS: [...BASE_APPS, ...LID_APPS],
  APP_IDS: { ...BASE_APP_IDS, ...LID_APP_IDS }
};
