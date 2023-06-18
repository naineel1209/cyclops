import React, {useEffect, useState} from 'react';
import {
    Button,
    Col,
    Collapse,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Row, Space,
    Switch,
    Table,
    Tabs,
    TabsProps,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {Icon} from '@ant-design/compatible';
import {useNavigate} from 'react-router';
import {useParams} from "react-router-dom";
import axios from 'axios';
import {Pie} from "@ant-design/charts";
import {release} from "os";
import {
    CheckCircleTwoTone,
    CloseSquareTwoTone, InfoCircleOutlined,
    LinkOutlined,
    MinusCircleOutlined,
    PlusOutlined, WarningFilled
} from "@ant-design/icons";
import Link from "antd/lib/typography/Link";
import AceEditor from "react-ace";
import { formatDistanceToNow } from 'date-fns';

const {Title, Text} = Typography;

interface module {
    name: String,
    namespace: String,
    template: {
        name: String,
        version: String,
        git: {
            repo: String,
            path: String,
        }
    }
}

const colors = ["pink", "yellow", "orange", "cyan", "green", "blue", "purple", "magenta", "lime"];
const pieColors = ["#ffb6c1", "#ffffe0", "#ffd580", "#e0ffff", "#90ee90", "#add8e6", "#cbc3e3", "#ff80ff", "#bfff00"];

function formatPodAge(podAge: string): string {
    const parsedDate = new Date(podAge);
    return formatDistanceToNow(parsedDate, { addSuffix: true });
}

const ModuleDetails = () => {
    const history = useNavigate();
    const [manifestModal, setManifestModal] = useState({
        on: false,
        kind: "",
        name: "",
        namespace: "",
    })
    const [logsModal, setLogsModal] = useState({
        on: false,
        namespace: '',
        pod: '',
        containers: []
    })
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleteName, setDeleteName] = useState("");
    const [resources, setResources] = useState([]);
    const [module, setModule] = useState<module>({
        name: "",
        namespace: "",
        template: {
            name: "",
            version: "",
            git: {
                repo: "",
                path: "",
            }
        }
    });

    let {moduleName} = useParams();
    useEffect(() => {
        axios.get(window.__RUNTIME_CONFIG__.REACT_APP_CYCLOPS_CTRL_HOST + `/modules/` + moduleName).then(res => {
            setModule(res.data);
        });

        axios.get(window.__RUNTIME_CONFIG__.REACT_APP_CYCLOPS_CTRL_HOST + `/modules/` + moduleName + `/resources`).then(res => {
            setResources(res.data);
        });

        setInterval(function () {
            axios.get(window.__RUNTIME_CONFIG__.REACT_APP_CYCLOPS_CTRL_HOST + `/modules/` + moduleName + `/resources`).then(res => {
                setResources(res.data);
            });
        }, 5000);
    }, []);

    const changeDeleteName = (e: any) => {
        setDeleteName(e.target.value)
    }

    const handleCancelManifest = () => {
        setManifestModal({
            on: false,
            kind: "",
            name: "",
            namespace: "",
        })
    };

    const handleCancelLogs = () => {
        setLogsModal({
            on: false,
            namespace: '',
            pod: '',
            containers: [],
        })
    };

    const handleCancel = () => {
        setLoading(false);
    };

    const getManifest = () => {
        console.log(manifestModal)

        for (let i = 0; i < resources.length; i++) {
            if (resources[i]['kind'] == manifestModal.kind &&
                resources[i]['namespace'] == manifestModal.namespace &&
                resources[i]['name'] == manifestModal.name) {
                return resources[i]['manifest'];
            }
        }

        return "{}"
    }

    const getLogs = () => {
        return logs; // Return the stored logs
    };

    const deleteDeployment = () => {
        axios.delete(window.__RUNTIME_CONFIG__.REACT_APP_CYCLOPS_CTRL_HOST + `/modules/` + moduleName).then(res => {
            window.location.href = "/modules"
        });
    }

    const getResourcesToDelete = () => {
        let resourcesToDelete: JSX.Element[] = [];

        resources.forEach((resource: any) => {
            resourcesToDelete.push(
                <Row>{resource.kind}: {resource.namespace} / {resource.name}</Row>
            )
        })

        return resourcesToDelete
    }

    const resourceCollapses: {} | any = [];

    const getTabItems = () => {
        var items: TabsProps['items'] = []

        let cnt = 1;
        let container :any
        for (container of logsModal.containers) {
            items.push(
                {
                    key: container.name,
                    label: container.name,
                    children: <AceEditor style={{width: "100%"}} mode={"sass"} value={logs} readOnly={true} />,
                }
            )
            cnt++;
        }

        return items
    }

    const onLogsTabsChange = (container: string) => {
        axios.get(window.__RUNTIME_CONFIG__.REACT_APP_CYCLOPS_CTRL_HOST + '/resources/pods/' + logsModal.namespace + '/' + logsModal.pod + '/' + container + '/logs').then(res => {
            var log = ""
            res.data.forEach((s :string) => { log += s })
            setLogs(log);
        });
    }

    const genExtra = (resource: any) => {
        if (resource.deleted) {
            return (
                <Row gutter={[0, 8]}>
                    <Col span={15} style={{display: 'flex', justifyContent: 'flex-start'}}>
                        {resource.kind}
                    </Col>
                    <Col span={9} style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <WarningFilled style={{color: 'red', right: "0px", fontSize: '20px'}}/>
                    </Col>
                </Row>
            );
        } else {
            return (
                <Row>{resource.kind}</Row>
            );
        }
    }

    resources.forEach((resource: any) => {
        switch (resource.kind) {
            case "Deployment":
                var deletedWarning = (<p/>)

                if (resource.deleted) {
                    deletedWarning = (
                        <Tooltip title={"The resource is not a part of the Module and can be deleted"} trigger="click">
                            <WarningFilled style={{color: 'red', right: "0px", fontSize: '30px', paddingRight: "5px"}}/>
                        </Tooltip>
                    )
                }

                var deleteButton = (<p/>)

                if (resource.deleted) {
                    deleteButton = (
                        <Button onClick={function () {
                            axios.delete(window.__RUNTIME_CONFIG__.REACT_APP_CYCLOPS_CTRL_HOST + `/modules/` + moduleName + `/resources`, {
                                    data: {
                                        group: resource.group,
                                        version: resource.version,
                                        kind: resource.kind,
                                        name: resource.name,
                                        namespace: resource.namespace,
                                    }
                                }
                            ).then(res => {

                            });
                        }} danger block>Delete</Button>
                    )
                }

                let statusIcon = resource.status ? <CheckCircleTwoTone style={{fontSize: '200%', verticalAlign: 'middle'}} twoToneColor={'blue'} /> :
                    <CloseSquareTwoTone style={{fontSize: '200%', verticalAlign: 'middle'}} twoToneColor={'red'} />
                resourceCollapses.push(
                    <Collapse.Panel header={genExtra(resource)} key='deployment'>
                        <Row>
                            <Col>
                                {deletedWarning}
                            </Col>
                            <Col span={19}>
                                <Title level={3}>{resource.name}</Title>
                            </Col>
                            <Col span={4} style={{display: 'flex', justifyContent: 'flex-end'}}>
                                {deleteButton}
                            </Col>
                        </Row>
                        <Row>
                            <Title level={4}>{resource.namespace}</Title>
                        </Row>
                        <Row>
                            <Col style={{ float: "right" }}>
                                <Button onClick={function () {
                                    setManifestModal({
                                        on: true,
                                        kind: resource.kind,
                                        name: resource.name,
                                        namespace: resource.namespace,
                                    })
                                }} block>View Manifest</Button>
                            </Col>
                        </Row>
                        <Divider style={{fontSize: '120%'}} orientationMargin="0" orientation={"left"}>Replicas: {resource.replicas}</Divider>
                        <Row>
                            <Col span={24} style={{overflowX: "auto"}}>
                                <Table dataSource={resource.pods}>
                                    <Table.Column
                                        title='Name'
                                        dataIndex='name'
                                        filterSearch={true}
                                        key='name'
                                    />
                                    <Table.Column
                                        title='Node'
                                        dataIndex='node'
                                    />
                                    <Table.Column
                                        title='Phase'
                                        dataIndex='podPhase'
                                    />
                                    <Table.Column
                                        title='Started'
                                        dataIndex='started'
                                        render={(value) => (
                                            <span>{formatPodAge(value)}</span>
                                        )}
                                    />
                                    <Table.Column
                                        title='Images'
                                        dataIndex='containers'
                                        key='containers'
                                        width='15%'
                                        render={containers => (
                                            <>
                                                {
                                                    containers.map((container: any) => {
                                                        let color = container.status.running ? 'green' : 'red';

                                                        return (
                                                            <Tag color={color} key={container.image} style={{fontSize: '100%'}}>
                                                                {container.image}
                                                            </Tag>
                                                        );
                                                    })
                                                }
                                            </>
                                        )}
                                    />
                                    <Table.Column
                                        title='Logs'
                                        width='15%'
                                        render={ pod => (
                                            <>
                                                <Button onClick={function () {
                                                    axios.get(window.__RUNTIME_CONFIG__.REACT_APP_CYCLOPS_CTRL_HOST + '/resources/pods/' + resource.namespace + '/' + pod.name + '/' + pod.containers[0].name + '/logs').then(res => {
                                                        var log = ""
                                                        res.data.forEach((s :string) => { log += s })
                                                        setLogs(log);
                                                    });
                                                    setLogsModal({
                                                        on: true,
                                                        namespace: resource.namespace,
                                                        pod: pod .name,
                                                        containers: pod.containers
                                                    })
                                                }} block>View Logs</Button>
                                            </>
                                        )}
                                    />
                                </Table>
                            </Col>
                        </Row>
                    </Collapse.Panel>
                )
                return;
            case "Service":
                var deletedWarning = (<p/>)

                if (resource.deleted) {
                    deletedWarning = (
                            <Tooltip title={"The resource is not a part of the Module and can be deleted"} trigger="click">
                                <WarningFilled style={{color: 'red', right: "0px", fontSize: '30px', paddingRight: "5px"}}/>
                            </Tooltip>
                    )
                }

                var deleteButton = (<p/>)

                if (resource.deleted) {
                    deleteButton = (
                        <Button onClick={function () {
                            axios.delete(window.__RUNTIME_CONFIG__.REACT_APP_CYCLOPS_CTRL_HOST + `/modules/` + moduleName + `/resources`, {
                                    data: {
                                        group: resource.group,
                                        version: resource.version,
                                        kind: resource.kind,
                                        name: resource.name,
                                        namespace: resource.namespace,
                                    }
                                }
                            ).then(res => {

                            });
                        }} danger block>Delete</Button>
                    )
                }

                resourceCollapses.push(
                    <Collapse.Panel header={genExtra(resource)} key='service' style={{color: "red"}}>
                        <Row>
                            <Col>
                                {deletedWarning}
                            </Col>
                            <Col span={19}>
                                <Title level={3}>{resource.name}</Title>
                            </Col>
                            <Col span={4} style={{display: 'flex', justifyContent: 'flex-end'}}>
                                {deleteButton}
                            </Col>
                        </Row>
                        <Row>
                            <Title level={4}>{resource.namespace}</Title>
                        </Row>
                        <Row>
                            <Col style={{ float: "right" }}>
                                <Button onClick={function () {
                                    setManifestModal({
                                        on: true,
                                        kind: resource.kind,
                                        name: resource.name,
                                        namespace: resource.namespace,
                                    })
                                }} block>View Manifest</Button>
                            </Col>
                        </Row>
                        <Row>
                            <Text>{resource.port} {'->'} {resource.targetPort}</Text>
                        </Row>
                    </Collapse.Panel>
                )
                return;
        }
    })

    return (
        <div>
            <Row gutter={[40, 0]}>
                <Col span={9}>
                    <Title level={1}>
                        {module.name}
                    </Title>
                </Col>
            </Row>
            <Row gutter={[40, 0]}>
                <Col span={9}>
                    <Title level={3}>
                        {module.namespace}
                    </Title>
                </Col>
            </Row>
            <Row gutter={[40, 0]}>
                <Col span={9}>
                    { module.template.name.length !== 0 &&
                        <Link aria-level={3} href={`/configurations/` + module.template}>
                            <LinkOutlined/>
                            { module.template.name.length !== 0 && module.template.name + '@' + module.template.version }
                        </Link>
                    }

                    { module.template.name.length === 0 &&
                        <Link aria-level={3} href={ module.template.git.repo + `/tree/master/` + module.template.git.path }>
                            <LinkOutlined/>
                            { module.template.name.length === 0 && ' Template ref' }
                        </Link>
                    }
                </Col>
            </Row>
            <Row><Title></Title></Row>
            <Divider style={{fontSize: '120%'}} orientationMargin="0" orientation={"left"}>Actions</Divider>
            <Row gutter={[40, 0]}>
                <Col>
                    <Button onClick={function () {
                        window.location.href = "/modules/" + module.name + "/edit"
                    }} block>Edit</Button>
                </Col>
                <Col>
                    <Button onClick={function () {
                        setLoading(true)
                    }} danger block loading={loading}>Delete</Button>
                </Col>
            </Row>
            <Divider style={{fontSize: '120%'}} orientationMargin="0" orientation={"left"}>Resources</Divider>
            <Collapse defaultActiveKey={['deployment']}>
            {resourceCollapses}
            </Collapse>
            <Modal
                title="Delete module"
                visible={loading}
                onCancel={handleCancel}
                width={'40%'}
                footer={
                    <Button
                        danger
                        block
                        disabled={deleteName !== moduleName}
                        onClick={deleteDeployment}
                    >Delete</Button>
                }
            >
                <Divider style={{fontSize: '120%'}} orientationMargin="0" orientation={"left"}>Child resources</Divider>
                {getResourcesToDelete()}

                <Divider style={{fontSize: '120%'}} orientationMargin="0"/>
                In order to delete this module and related resources, type the name of the module in the box below

                <Input placeholder={moduleName} required onChange={changeDeleteName}/>
            </Modal>
            <Modal
                title="Manifest"
                visible={manifestModal.on}
                onCancel={handleCancelManifest}
                width={'40%'}
            >
                <AceEditor style={{width: "100%"}} mode={"sass"} value={getManifest()} readOnly={true} />
            </Modal>
            <Modal
                title="Logs"
                visible={logsModal.on}
                onCancel={handleCancelLogs}
                width={'40%'}
            >
                <Tabs defaultActiveKey="1" items={getTabItems()} onChange={onLogsTabsChange} />
            </Modal>
        </div>
    );
}

export default ModuleDetails;