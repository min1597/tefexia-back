import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { Exception } from './error.plugin'


export default class {
    pluginName: string = 'hypervisorPlugin'

    private _ProxmoxVE: {
        apiEndpoint: string,
        ticket: string,
        csrfToken: string
    } | null = null

    ProxmoxVE = {
        initialize: async (
            _apiEndpoint: string,
            _credentials: {
                username: string,
                password: string
            }
        ): Promise<{ success: true } | { success: false, error?: Error }> => {
            try {
                const _authenticatedResult = await axios.post(`${ _apiEndpoint }/api2/json/access/ticket`, new URLSearchParams({
                    username: _credentials.username,
                    password: _credentials.password
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })

                console.log(_authenticatedResult.data)

                if(_authenticatedResult.status !== 200) return { success: false, error: new Error('Failed to authenticate with ProxmoxVE.') }

                this._ProxmoxVE = {
                    apiEndpoint: _apiEndpoint,
                    ticket: _authenticatedResult.data.data.ticket,
                    csrfToken: _authenticatedResult.data.data.CSRFPreventionToken
                }

                return { success: true }
            } catch(error) {
                return { success: false, error: error instanceof Error ? error : new Error('Failed to initialize ProxmoxVE client.', { cause: error }) }
            }
        },

        Node: {
            get: async (
                _nodeName?: string
            ): Promise<
                { success: true, nodes: Array<string> }
                | { success: true, node: { name: string, cpu: number, memory: number } }
                | { success: false, error?: Error }
            > => {
                try {
                    if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }
                    
                    const _getNodesResult = await axios.get(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes${ _nodeName ? `/${ _nodeName }/status` : '' }`, {
                        headers: {
                            cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                            CSRFPreventionToken: this._ProxmoxVE.csrfToken
                        }
                    })

                    if(_getNodesResult.status !== 200) return { success: false, error: new Error('Failed to get ProxmoxVE node.') }

                    if(_nodeName) {
                        return { success: true, node: {
                            name: _nodeName,
                            cpu: _getNodesResult.data.data.cpuinfo.model,
                            memory: _getNodesResult.data.data.memory.total,
                        } }
                    } else {
                        return { success: true, nodes: _getNodesResult.data.data.map((_node: {
                            id: string,
                            level: string,
                            node: string,
                            ssl_fingerprint: string,
                            status: string,
                            type: string
                        }) => _node.node) }
                    }
                } catch(error) {
                    return { success: false, error: error instanceof Error ? error : new Error('Failed to get ProxmoxVE node.', { cause: error }) }
                }
            }
        },

        VirtualMachine: {
            get: async (
                _nodeName: string,
                _virtualMachineId?: number
            ): Promise<
                {
                    success: true,
                    type: 'virtualMachine',
                    virtualMachine: {
                        id: number,
                        name: string,
                        status: string,
                        network?: { [ nicName in string ]: { inboundTraffic: number, outboundTraffic: number } } | null,
                        memory: { maximum: number, currentUsage?: number },
                        disk: { list?: Array<'ide0' | 'ide1' | 'ide2' | 'ide3' | 'scsi0' | 'scsi1' | 'scsi2' | 'scsi3' | 'scsi4' | 'scsi5' | 'scsi6' | 'scsi7' | 'scsi8' | 'scsi9' | 'scsi10' | 'scsi11' | 'scsi12' | 'scsi13' | 'scsi14' | 'scsi15' | 'scsi16' | 'scsi17' | 'scsi18' | 'scsi19' | 'scsi20' | 'scsi21' | 'scsi22' | 'scsi23' | 'scsi24' | 'scsi25' | 'scsi26' | 'scsi27' | 'scsi28' | 'scsi29' | 'scsi30' | 'virtio0' | 'virtio1' | 'virtio2' | 'virtio3' | 'virtio4' | 'virtio5' | 'virtio6' | 'virtio7' | 'virtio8' | 'virtio9' | 'virtio10' | 'virtio11' | 'virtio12' | 'virtio13' | 'virtio14' | 'virtio15' | 'sata0' | 'sata1' | 'sata2' | 'sata3' | 'sata4' | 'sata5' | 'efidisk0' | 'tpmstate0'>, value: number, read?: number, write?: number },
                        isTemplate: boolean
                    }
                }
                | { success: true, type: 'virtualMachines', virtualMachines: Array<{ id: number, name: string, status: string, isTemplate: boolean }> }
                | { success: false, error?: Error }
            > => {
                try {
                    if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                    const _getVirtualMachinesResult = await axios.get(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu${ _virtualMachineId ? `/${ _virtualMachineId }/status/current` : '' }`, {
                        headers: {
                            cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                            CSRFPreventionToken: this._ProxmoxVE.csrfToken
                        }
                    })

                    if(_getVirtualMachinesResult.status !== 200) return { success: false, error: new Error('Failed to get ProxmoxVE virtual machine.') }

                    if(_virtualMachineId) {
                        console.log(_getVirtualMachinesResult.data.data)
                        return { success: true, type: 'virtualMachine', virtualMachine: {
                            id: _virtualMachineId,
                            name: _getVirtualMachinesResult.data.data.name,
                            status: _getVirtualMachinesResult.data.data.status,

                            network: _getVirtualMachinesResult.data.data.nics ? Object.fromEntries(Object.keys(_getVirtualMachinesResult.data.data.nics).map(_nic => {
                                return [ _nic, {
                                    inboundTraffic: _getVirtualMachinesResult.data.data.nics[_nic].netin,
                                    outboundTraffic: _getVirtualMachinesResult.data.data.nics[_nic].netout,
                                } ]
                            })) : null,
                            memory: {
                                maximum: _getVirtualMachinesResult.data.data.maxmem,
                                currentUsage: _getVirtualMachinesResult.data.data.status == 'running' ? _getVirtualMachinesResult.data.data.mem : undefined,
                            },
                            disk: {
                                list: _getVirtualMachinesResult.data.data.status == 'running' ? Object.keys(_getVirtualMachinesResult.data.data.blockstat) as Array<'ide0' | 'ide1' | 'ide2' | 'ide3' | 'scsi0' | 'scsi1' | 'scsi2' | 'scsi3' | 'scsi4' | 'scsi5' | 'scsi6' | 'scsi7' | 'scsi8' | 'scsi9' | 'scsi10' | 'scsi11' | 'scsi12' | 'scsi13' | 'scsi14' | 'scsi15' | 'scsi16' | 'scsi17' | 'scsi18' | 'scsi19' | 'scsi20' | 'scsi21' | 'scsi22' | 'scsi23' | 'scsi24' | 'scsi25' | 'scsi26' | 'scsi27' | 'scsi28' | 'scsi29' | 'scsi30' | 'virtio0' | 'virtio1' | 'virtio2' | 'virtio3' | 'virtio4' | 'virtio5' | 'virtio6' | 'virtio7' | 'virtio8' | 'virtio9' | 'virtio10' | 'virtio11' | 'virtio12' | 'virtio13' | 'virtio14' | 'virtio15' | 'sata0' | 'sata1' | 'sata2' | 'sata3' | 'sata4' | 'sata5' | 'efidisk0' | 'tpmstate0'> : undefined,
                                value: _getVirtualMachinesResult.data.data.maxdisk,
                                read: _getVirtualMachinesResult.data.data.status == 'running' ? _getVirtualMachinesResult.data.data.diskread : undefined,
                                write: _getVirtualMachinesResult.data.data.status == 'running' ? _getVirtualMachinesResult.data.data.diskwrite : undefined
                            },
                            isTemplate: _getVirtualMachinesResult.data.data.template == 1 ? true : false
                        } }
                    } else {
                        return { success: true, type: 'virtualMachines', virtualMachines: _getVirtualMachinesResult.data.data.map((_virtualMachine: {
                            vmid: number,
                            name: string,
                            pid: number,
                            cpu: number,
                            cpus: number,
                            maxdisk: number,
                            disk: number,
                            netout: number,
                            netin: number,
                            diskwrite: number,
                            diskread: number,
                            maxmem: number,
                            mem: number,
                            uptime: number,
                            template?: 0 | 1,
                            status: 'running' | 'stopped'
                        }) => {
                            return {
                                id: _virtualMachine.vmid,
                                name: _virtualMachine.name,
                                status: _virtualMachine.status,
                                isTemplate: _virtualMachine.template == 1 ? true : false
                            }
                        }) }
                    }
                } catch(error) {
                    return { success: false, error: error instanceof Error ? error : new Error('Failed to get ProxmoxVE virtual machine.', { cause: error }) }
                }
            },
            clone: async (
                _nodeName: string,
                _virtualMachineId: number,
                _newVirtualMachineId: number,
                _cloneName: string,
    
                _options?: {
                    bandwidth?: number,
                    description?: string,
                    format?: 'raw' | 'qcow2' | 'vmdk',
                    full?: boolean,
                    pool?: string,
                    snapname?: string,
                    storage?: string,
                    target?: string
                }
            ): Promise<{ success: true } | { success: false, error?: Error }> => {
                try {
                    if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }
    
                    const _createCloneResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/clone`, {
                        newid: _newVirtualMachineId,
                        name: _cloneName.replace(/ /g, '-'),
                        ... _options
                    }, {
                        headers: {
                            cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                            CSRFPreventionToken: this._ProxmoxVE.csrfToken
                        }
                    })
    
                    if(_createCloneResult.status !== 200) return { success: false, error: new Error('Failed to create ProxmoxVE virtual machine clone.') }
    
                    return { success: true }
                } catch(error) {
                    console.log(error.response.data)
                    return { success: false, error: error instanceof Error ? error : new Error('Failed to create ProxmoxVE virtual machine clone.', { cause: error }) }
                }
            },
            update: async (
                _nodeName: string,
                _virtualMachineId: number,
                _options?: {
                    [ optionName: string ]: string | number | boolean
                }
            ): Promise<{ success: true } | { success: false, error?: Error }> => {
                try {
                    if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                    const _updateVirtualMachineResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/config`, {
                        ... _options
                    }, {
                        headers: {
                            cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                            CSRFPreventionToken: this._ProxmoxVE.csrfToken
                        }
                    })

                    if(_updateVirtualMachineResult.status !== 200) return { success: false, error: new Error('Failed to update ProxmoxVE virtual machine.') }

                    return { success: true }
                } catch(error) {
                    return { success: false, error: error instanceof Error ? error : new Error('Failed to update ProxmoxVE virtual machine.', { cause: error }) }
                }
            },


            Storage: {
                move: async (
                    _nodeName: string,
                    _virtualMachineId: number,
                    _diskName: 'ide0' | 'ide1' | 'ide2' | 'ide3' | 'scsi0' | 'scsi1' | 'scsi2' | 'scsi3' | 'scsi4' | 'scsi5' | 'scsi6' | 'scsi7' | 'scsi8' | 'scsi9' | 'scsi10' | 'scsi11' | 'scsi12' | 'scsi13' | 'scsi14' | 'scsi15' | 'scsi16' | 'scsi17' | 'scsi18' | 'scsi19' | 'scsi20' | 'scsi21' | 'scsi22' | 'scsi23' | 'scsi24' | 'scsi25' | 'scsi26' | 'scsi27' | 'scsi28' | 'scsi29' | 'scsi30' | 'virtio0' | 'virtio1' | 'virtio2' | 'virtio3' | 'virtio4' | 'virtio5' | 'virtio6' | 'virtio7' | 'virtio8' | 'virtio9' | 'virtio10' | 'virtio11' | 'virtio12' | 'virtio13' | 'virtio14' | 'virtio15' | 'sata0' | 'sata1' | 'sata2' | 'sata3' | 'sata4' | 'sata5' | 'efidisk0' | 'tpmstate0',
                    _targetStorageName: string
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _moveStorageResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/move_disk`, {
                            disk: _diskName,
                            storage: _targetStorageName
                        }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_moveStorageResult.status !== 200) return { success: false, error: new Error('Failed to move ProxmoxVE virtual machine storage.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to move ProxmoxVE virtual machine storage.', { cause: error }) }
                    }
                },
                resize: async (
                    _nodeName: string,
                    _virtualMachineId: number,
                    _diskName: 'ide0' | 'ide1' | 'ide2' | 'ide3' | 'scsi0' | 'scsi1' | 'scsi2' | 'scsi3' | 'scsi4' | 'scsi5' | 'scsi6' | 'scsi7' | 'scsi8' | 'scsi9' | 'scsi10' | 'scsi11' | 'scsi12' | 'scsi13' | 'scsi14' | 'scsi15' | 'scsi16' | 'scsi17' | 'scsi18' | 'scsi19' | 'scsi20' | 'scsi21' | 'scsi22' | 'scsi23' | 'scsi24' | 'scsi25' | 'scsi26' | 'scsi27' | 'scsi28' | 'scsi29' | 'scsi30' | 'virtio0' | 'virtio1' | 'virtio2' | 'virtio3' | 'virtio4' | 'virtio5' | 'virtio6' | 'virtio7' | 'virtio8' | 'virtio9' | 'virtio10' | 'virtio11' | 'virtio12' | 'virtio13' | 'virtio14' | 'virtio15' | 'sata0' | 'sata1' | 'sata2' | 'sata3' | 'sata4' | 'sata5' | 'efidisk0' | 'tpmstate0',
                    _size: number
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _resizeStorageResult = await axios.put(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/resize`, {
                            disk: _diskName,
                            size: _size
                        }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_resizeStorageResult.status !== 200) return { success: false, error: new Error('Failed to resize ProxmoxVE virtual machine storage.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to resize ProxmoxVE virtual machine storage.', { cause: error }) }
                    }
                }
            },

            Status: {
                reboot: async (
                    _nodeName: string,
                    _virtualMachineId: number
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _rebootVirtualMachineResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/status/reboot`, {  }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_rebootVirtualMachineResult.status !== 200) return { success: false, error: new Error('Failed to reboot ProxmoxVE virtual machine.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to reboot ProxmoxVE virtual machine.', { cause: error }) }
                    }
                },
                shutdown: async (
                    _nodeName: string,
                    _virtualMachineId: number
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _shutdownVirtualMachineResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/status/shutdown`, {  }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_shutdownVirtualMachineResult.status !== 200) return { success: false, error: new Error('Failed to shutdown ProxmoxVE virtual machine.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to shutdown ProxmoxVE virtual machine.', { cause: error }) }
                    }
                },
                start: async (
                    _nodeName: string,
                    _virtualMachineId: number
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _startVirtualMachineResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/status/start`, {  }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_startVirtualMachineResult.status !== 200) return { success: false, error: new Error('Failed to start ProxmoxVE virtual machine.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to start ProxmoxVE virtual machine.', { cause: error }) }
                    }
                },
                stop: async (
                    _nodeName: string,
                    _virtualMachineId: number
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _stopVirtualMachineResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/status/stop`, {  }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_stopVirtualMachineResult.status !== 200) return { success: false, error: new Error('Failed to stop ProxmoxVE virtual machine.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to stop ProxmoxVE virtual machine.', { cause: error }) }
                    }
                },
                suspend: async (
                    _nodeName: string,
                    _virtualMachineId: number
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _suspendVirtualMachineResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/status/suspend`, {  }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_suspendVirtualMachineResult.status !== 200) return { success: false, error: new Error('Failed to suspend ProxmoxVE virtual machine.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to suspend ProxmoxVE virtual machine.', { cause: error }) }
                    }
                },
                resume: async (
                    _nodeName: string,
                    _virtualMachineId: number
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _resumeVirtualMachineResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/status/resume`, {  }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_resumeVirtualMachineResult.status !== 200) return { success: false, error: new Error('Failed to resume ProxmoxVE virtual machine.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to resume ProxmoxVE virtual machine.', { cause: error }) }
                    }
                }
            },
            Snapshot: {
                create: async (
                    _nodeName: string,
                    _virtualMachineId: number,
                    _snapshotName: string
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _createSnapshotResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/snapshot`, {
                            snapname: _snapshotName
                        }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_createSnapshotResult.status !== 200) return { success: false, error: new Error('Failed to create ProxmoxVE virtual machine snapshot.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to create ProxmoxVE virtual machine snapshot.', { cause: error }) }
                    }
                },
                rollback: async (
                    _nodeName: string,
                    _virtualMachineId: number,
                    _snapshotName: string
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _rollbackSnapshotResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/snapshot/${ _snapshotName }`, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_rollbackSnapshotResult.status !== 200) return { success: false, error: new Error('Failed to rollback ProxmoxVE virtual machine snapshot.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to rollback ProxmoxVE virtual machine snapshot.', { cause: error }) }
                    }
                }
            },
            Agent: {
                changePassword: async (
                    _nodeName: string,
                    _virtualMachineId: number,
                    _username: string,
                    _password: string
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _changePasswordResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/agent/set-user-password`, {
                            username: _username,
                            password: _password
                        }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_changePasswordResult.status !== 200) return { success: false, error: new Error('Failed to change ProxmoxVE virtual machine agent password.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to change ProxmoxVE virtual machine agent password.', { cause: error }) }
                    }
                },
                getNetworkInterface: async (
                    _nodeName: string,
                    _virtualMachineId: number
                ): Promise<{ success: true, data: {
                    [ interfaceName: string ]: {
                        macAddress: string,
                        ipAddresses: Array<{ type: 'ipv4' | 'ipv6', address: string, prefix: number }>,
                        statistics: {
                            received: {
                                bytes: number,
                                packets: number,
                                errors: number,
                                dropped: number
                            },
                            sent: {
                                bytes: number,
                                packets: number,
                                errors: number,
                                dropped: number
                            }
                        }
                    }
                } } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _getNetworkInterfaceResult = await axios.get(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/agent/network-get-interfaces`, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_getNetworkInterfaceResult.status !== 200) return { success: false, error: new Error('Failed to get ProxmoxVE virtual machine network interface.') }

                        return { success: true, data: Object.fromEntries(_getNetworkInterfaceResult.data.map((_interface: any) => [ _interface.name, {
                            macAddress: _interface['hardware-address'],
                            ipAddresses: _interface['ip-addresses'].map((_ipAddress: any) => ({
                                type: _ipAddress['ip-address-type'],
                                address: _ipAddress['ip-address'],
                                prefix: _ipAddress['ip-prefix']
                            })),
                            statistics: {
                                received: {
                                    bytes: _interface['statistics']['rx-bytes'],
                                    packets: _interface['statistics']['rx-packets'],
                                    errors: _interface['statistics']['rx-errs'],
                                    dropped: _interface['statistics']['rx-dropped']
                                },
                                sent: {
                                    bytes: _interface['statistics']['tx-bytes'],
                                    packets: _interface['statistics']['tx-packets'],
                                    errors: _interface['statistics']['tx-errs'],
                                    dropped: _interface['statistics']['tx-dropped']
                                }
                            }
                        } ])) }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to get ProxmoxVE virtual machine network interface.', { cause: error }) }
                    }
                }
            },
            Firewall: {
                addRule: async (
                    _nodeName: string,
                    _virtualMachineId: number,
                    _rule: {
                        source?: string,
                        dest?: string,
                        type: 'in' | 'out' | 'forward' | 'group',
                        action: 'ACCEPT' | 'DROP' | 'REJECT'
                    }
                ): Promise<{ success: true } | { success: false, error?: Error }> => {
                    try {
                        if(this._ProxmoxVE == null) return { success: false, error: new Error('ProxmoxVE client is not initialized.') }

                        const _addRuleResult = await axios.post(`${ this._ProxmoxVE.apiEndpoint }/api2/json/nodes/${ _nodeName }/qemu/${ _virtualMachineId }/firewall/rules`, {
                            ... _rule
                        }, {
                            headers: {
                                cookie: `PVEAuthCookie=${ this._ProxmoxVE.ticket }`,
                                CSRFPreventionToken: this._ProxmoxVE.csrfToken
                            }
                        })

                        if(_addRuleResult.status !== 200) return { success: false, error: new Error('Failed to add ProxmoxVE virtual machine firewall rule.') }

                        return { success: true }
                    } catch(error) {
                        return { success: false, error: error instanceof Error ? error : new Error('Failed to add ProxmoxVE virtual machine firewall rule.', { cause: error }) }
                    }
                }
            }
        }
    }
}
