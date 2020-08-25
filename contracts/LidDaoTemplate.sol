pragma solidity 0.5.16;

import "./grantees/LidVotingRightsGrantee.sol";
import "@aragon/templates-shared/contracts/BaseTemplate.sol";

contract LidDaoTemplate is BaseTemplate {

  // bytes32 constant internal LID_VR_GRANTEE_APP_ID = keccak256("lidvotingrightsgrantee");
  bytes32 internal constant LID_VR_GRANTEE_APP_ID = 0x23e0763d95d9c50b5a659002f6845ab4ecee9630a09736ff770c781656b14167;

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
    uint64[3] memory _votingSettings,
    address _permissionManager
  )
  public
  {
    _validateId(_id);
    _validateVotingSettings(_votingSettings);

    (Kernel dao, ACL acl) = _createDAO();
    (Voting voting) = _setupApps(dao, acl, _votingSettings, _permissionManager);
    _transferRootPermissionsFromTemplateAndFinalizeDAO(dao, _permissionManager);
    _registerID(_id, dao);
  }

  function _setupApps(
    Kernel _dao,
    ACL _acl,
    uint64[3] memory _votingSettings,
    address _permissionManager
  )
  internal
  returns (Voting)
  {
    Agent agent = _installDefaultAgentApp(_dao);
    LidVotingRightsGrantee vrGrantee = _installLidVotingRightsGrantee(_dao, lidVotingRights);
    Voting voting = _installVotingApp(_dao, lidVotingRights, _votingSettings);

    _setupPermissions(
      _acl,
      agent,
      voting,
      address(vrGrantee),
      _permissionManager
    );

    return (voting);
  }

  function _installLidVotingRightsGrantee(
    Kernel _dao,
    LidVotingRights _lidVotingRights
  )
  internal
  returns (LidVotingRightsGrantee)
  {
    bytes memory initializeData = abi.encodeWithSelector(
      LidVotingRightsGrantee(0).initialize.selector,
      _lidVotingRights
    );
    return LidVotingRightsGrantee(
      _installNonDefaultApp(_dao, LID_VR_GRANTEE_APP_ID, initializeData)
    );
  }

  function _setupPermissions(
    ACL _acl,
    Agent _agent,
    Voting _voting,
    address _createVotesGrantee,
    address _permissionManager
  )
  internal
  {
    _createAgentPermissions(_acl, _agent, _voting, _permissionManager);
    _createVaultPermissions(_acl, Vault(_agent), _voting, _permissionManager);
    _createEvmScriptsRegistryPermissions(_acl, _voting, _permissionManager);
    _createVotingPermissions(_acl, _voting, _voting, _createVotesGrantee, _permissionManager);
  }

  function _validateVotingSettings(uint64[3] memory _votingSettings) private pure {
    require(_votingSettings.length == 3, ERROR_BAD_VOTE_SETTINGS);
  }
}
