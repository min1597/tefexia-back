import axios from 'axios'
import { Instance, InstanceStatus } from '../database/entity/Instance.entity'
import { getDatabaseClient } from '../database/main'
import CryptoJS from 'crypto-js'
import { Cluster, ClusterStatus, KVMType } from '../database/entity/Cluster.entity'
import { IsNull } from 'typeorm'
import { Product } from '../database/entity/service/Product.entity'
import { ProxmoxVE } from '../database/entity/hypervisor/ProxmoxVE.entity'
import hypervisorPlugin from './hypervisor.plugin'
import utilityPlugin from './utility.plugin'
export default {
    pluginName: 'queuePlugin',

    Queue: {
        installInstance: async () => {
            const _instances = await getDatabaseClient().manager.getRepository(Instance).find({ where: { status: InstanceStatus.PENDING, is_active: true } })

            for(const _instance of _instances) {
                console.log(_instance)
                if((await getDatabaseClient().manager.findOne(Instance, { where: { uuid: _instance.uuid, is_active: true } })).status !== InstanceStatus.PENDING) continue

                await getDatabaseClient().manager.update(Instance, { uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.INSTALLING })

                const product = await getDatabaseClient().manager.getRepository(Product).findOne({
                    where: { uuid: _instance.product_id , is_active: true }
                })

                const cluster = await getDatabaseClient().manager.getRepository(ProxmoxVE).findOne({
                    where: {
                        uuid: _instance.cluster_id,
                        is_active: true
                    }
                })

                if (!cluster) {
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Cluster not found' })
                    continue
                }

                const _hypervisorPlugin = new hypervisorPlugin()

                const _initializeResult = await _hypervisorPlugin.ProxmoxVE.initialize(cluster.host, cluster.credentials)
                if(_initializeResult.success == false) {
                    console.log(_initializeResult.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to initialize ProxmoxVE' })
                    continue
                }

                if(Object.keys(cluster.template).includes(_instance.operating_system) == false) {
                    console.log('Operating system not found')
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Operating system not found' })
                    continue
                }

                const _createInstanceResult = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.clone(cluster.node, cluster.template[_instance.operating_system], 1000 + _instance.srl, _instance.uuid, {
                    
                })
                if(_createInstanceResult.success == false) {
                    console.log(_createInstanceResult.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to create ProxmoxVE virtual machine' })
                    continue
                }

                await new Promise(resolve => setTimeout(resolve, 90000))

                const _updateInstanceResult = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.update(cluster.node, 1000 + _instance.srl, {
                    cores: product.specification.cpu,
                    memory: product.specification.memory
                })

                const _startInstanceResult = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.Status.start(cluster.node, 1000 + _instance.srl)
                if(_startInstanceResult.success == false) {
                    console.log(_startInstanceResult.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to start ProxmoxVE virtual machine' })
                    continue
                }

                await new Promise(resolve => setTimeout(resolve, 10000))
                
                const _virtualMachine = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.get(cluster.node, 1000 + _instance.srl)

                if(_virtualMachine.success == false) {
                    console.log(_virtualMachine.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to get ProxmoxVE virtual machine' })
                    continue
                }

                if(_virtualMachine.type !== 'virtualMachine') continue

                const _stopInstanceResult = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.Status.stop(cluster.node, 1000 + _instance.srl)
                if(_stopInstanceResult.success == false) {
                    console.log(_stopInstanceResult.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to stop ProxmoxVE virtual machine' })
                    continue
                }

                await new Promise(resolve => setTimeout(resolve, 10000))

                // const _moveStorageResult = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.Storage.move(cluster.node, 1000 + _instance.srl, _virtualMachine.virtualMachine.disk.list[0], cluster.storage)
                // if(_moveStorageResult.success == false) {
                //     console.log(_moveStorageResult.error)
                //     await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to move ProxmoxVE virtual machine storage' })
                //     continue
                // }

                const _resizeStorageResult = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.Storage.resize(cluster.node, 1000 + _instance.srl, _virtualMachine.virtualMachine.disk.list[0], product.specification.disk)
                if(_resizeStorageResult.success == false) {
                    console.log(_resizeStorageResult.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to resize ProxmoxVE virtual machine storage' })
                    continue
                }
            }
        },

        confirmInstance: async () => {
            const _instances = await getDatabaseClient().manager.getRepository(Instance).find({ where: { status: InstanceStatus.INSTALLING, is_active: true } })

            for(const _instance of _instances) {
                console.log(_instance)

                const cluster = await getDatabaseClient().manager.getRepository(ProxmoxVE).findOne({
                    where: {
                        uuid: _instance.cluster_id,
                        is_active: true
                    }
                })

                const _hypervisorPlugin = new hypervisorPlugin()

                const _initializeResult = await _hypervisorPlugin.ProxmoxVE.initialize(cluster.host, cluster.credentials)
                if(_initializeResult.success == false) {
                    console.log(_initializeResult.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to initialize ProxmoxVE' })
                    continue
                }

                const _virtualMachine = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.get(cluster.node, 1000 + _instance.srl)

                if(_virtualMachine.success == false) {
                    console.log(_virtualMachine.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to get ProxmoxVE virtual machine' })
                    continue
                }

                const _networkInterface = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.Agent.getNetworkInterface(cluster.node, 1000 + _instance.srl)
                console.log(_networkInterface)

                if(_networkInterface.success == false) {
                    continue
                }

                const _newPassword = utilityPlugin.getRandomStrings(12, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?')

                const _changePasswordResult = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.Agent.changePassword(cluster.node, 1000 + _instance.srl, {
                    'windows_server_2022': 'Administrator',
                    'linux_ubuntu_22_04': 'ubuntu'
                }[_instance.operating_system], _newPassword)
                console.log(_changePasswordResult)

                if(_changePasswordResult.success == false) {
                    console.log(_changePasswordResult.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to change ProxmoxVE virtual machine agent password' })
                    continue
                }

                await new Promise(resolve => setTimeout(resolve, 10000))

                const _rebootInstanceResult = await _hypervisorPlugin.ProxmoxVE.VirtualMachine.Status.reboot(cluster.node, 1000 + _instance.srl)
                console.log(_rebootInstanceResult)

                if(_rebootInstanceResult.success == false) {
                    console.log(_rebootInstanceResult.error)
                    await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.FAILURE, failure_reason: 'Failed to reboot ProxmoxVE virtual machine' })
                    continue
                }

                await new Promise(resolve => setTimeout(resolve, 10000))

                await getDatabaseClient().manager.update(Instance, { uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.ACTIVE, password: _newPassword })
            }
        }
    }
}