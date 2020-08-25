pragma solidity 0.4.24;

import "@aragon/templates-shared/contracts/BaseTemplate.sol";

contract LidDaoTemplate is BaseTemplate {
  string constant private ERROR_BAD_VOTE_SETTINGS = "LID_DAO_BAD_VOTE_SETTINGS";

  MiniMeToken public lidVotingRights;

  constructor(
    MiniMeToken _lidVotingRights,
    DAOFactory _daoFactory,
    ENS _ens,
    IFIFSResolvingRegistrar _aragonID
  )
  BaseTemplate(_daoFactory, _ens, MiniMeTokenFactory(address(0)), _aragonID)
  public
  {
    require(_lidVotingRights != address(0), "Invalid LID Voting Rights");
    lidVotingRights = _lidVotingRights;
    _ensureAragonIdIsValid(_aragonID);
  }

  /**
  * @dev Deploy a Company DAO using a LidStaking token
  * @param _id String with the name for org, will assign `[id].aragonid.eth`
  * @param _votingSettings Array of [supportRequired, minAcceptanceQuorum, voteDuration] to set up the voting app of the organization
  */
  function newInstance(
    string memory _id,
    uint64[3] memory _votingSettings
  )
  public
  {
    _validateId(_id);
    _validateVotingSettings(_votingSettings);

    (Kernel dao, ACL acl) = _createDAO();
    (Voting voting) = _setupApps(dao, acl, _votingSettings);
    _transferRootPermissionsFromTemplateAndFinalizeDAO(dao, voting);
    _registerID(_id, dao);
  }

  function _setupApps(
    Kernel _dao,
    ACL _acl,
    uint64[3] memory _votingSettings
  )
  internal
  returns (Voting)
  {
    Agent agent = _installDefaultAgentApp(_dao);
    Voting voting = _installVotingApp(_dao, lidVotingRights, _votingSettings);

    _setupPermissions(_acl, agent, voting);

    return (voting);
  }

  function _setupPermissions(
    ACL _acl,
    Agent _agent,
    Voting _voting
  )
  internal
  {
    _createAgentPermissions(_acl, _agent, _voting, _voting);
    _createVaultPermissions(_acl, Vault(_agent), _voting, _voting);
    _createEvmScriptsRegistryPermissions(_acl, _voting, _voting);
    _createVotingPermissions(_acl, _voting, _voting, _voting, _voting);
    _acl.createPermission(address(0), _voting, _voting.CREATE_VOTES_ROLE(), address(0));
  }

  function _validateVotingSettings(uint64[3] memory _votingSettings) private pure {
    require(_votingSettings.length == 3, ERROR_BAD_VOTE_SETTINGS);
  }
}
