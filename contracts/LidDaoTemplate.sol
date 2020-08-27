pragma solidity 0.4.24;

import "./grantees/LidVotingRightsGrantee.sol";
import "@aragon/templates-shared/contracts/BaseTemplate.sol";

contract LidDaoTemplate is BaseTemplate {

  // bytes32 constant internal LID_VR_GRANTEE_APP_ID = keccak256("lidvotingrightsgrantee");
  bytes32 internal constant LID_VR_GRANTEE_APP_ID = 0x23e0763d95d9c50b5a659002f6845ab4ecee9630a09736ff770c781656b14167;

  string constant private ERROR_BAD_VOTE_SETTINGS = "LID_DAO_BAD_VOTE_SETTINGS";

  constructor(
    DAOFactory _daoFactory,
    ENS _ens,
    MiniMeTokenFactory _minimeTokenFactory,
    IFIFSResolvingRegistrar _aragonID
  )
  BaseTemplate(_daoFactory, _ens, _minimeTokenFactory, _aragonID)
  public
  {
    _ensureAragonIdIsValid(_aragonID);
  }

  /**
  * @dev Deploy a Company DAO using a LidStaking token
  * @param _id String with the name for org, will assign `[id].aragonid.eth`
  * @param _votingSettings Array of [supportRequired, minAcceptanceQuorum, voteDuration] to set up the voting app of the organization
  */
  function newInstance(
    string memory _id,
    MiniMeToken _lidVotingRights,
    uint64[3] memory _votingSettings,
    address _permissionManager
  )
  public
  {
    require(_lidVotingRights != address(0), "Invalid LID Voting Rights");

    _validateId(_id);
    _validateVotingSettings(_votingSettings);

    (Kernel dao, ACL acl) = _createDAO();
    _setupApps(dao, acl, _lidVotingRights, _votingSettings, _permissionManager);
    _transferRootPermissionsFromTemplateAndFinalizeDAO(dao, _permissionManager);
    _registerID(_id, dao);
  }

  function _setupApps(
    Kernel _dao,
    ACL _acl,
    MiniMeToken _lidVotingRights,
    uint64[3] memory _votingSettings,
    address _permissionManager
  )
  internal
  {
    Agent agent = _installDefaultAgentApp(_dao);
    LidVotingRightsGrantee vrGrantee = _installLidVotingRightsGrantee(_dao, _lidVotingRights);
    Voting voting = _installVotingApp(_dao, _lidVotingRights, _votingSettings);

    _setupPermissions(
      _acl,
      agent,
      voting,
      address(vrGrantee),
      _permissionManager
    );
  }

  function _installLidVotingRightsGrantee(
    Kernel _dao,
    MiniMeToken _lidVotingRights
  )
  internal
  returns (LidVotingRightsGrantee)
  {
    bytes memory initializeData = abi.encodeWithSelector(
      LidVotingRightsGrantee(0).initialize.selector,
      _lidVotingRights
    );

    LidVotingRightsGrantee logic = new LidVotingRightsGrantee();

    address instance = address(_dao.newAppInstance(
      LID_VR_GRANTEE_APP_ID,
      logic,
      initializeData,
      false
    ));
    emit InstalledApp(instance, LID_VR_GRANTEE_APP_ID);
    return LidVotingRightsGrantee(instance);
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
