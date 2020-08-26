const { getENS, getTemplateAddress } = require('@aragon/templates-shared/lib/ens')(web3, artifacts)

const LidDaoTemplate = artifacts.require('LidDaoTemplate')

contract('LidDaoTemplate', ([_]) => {
  let ens, template

  before('fetch LidDaoTemplate and ENS', async () => {
    ens = await getENS()
    template = LidDaoTemplate.at(await getTemplateAddress())
  })

  context('create new instance', () => {
    it('testing testing', async () => {
      console.log("HERERERE")
      console.log(template.address)
      assert.isTrue(false, "whoopsies")
    })
  })
})
