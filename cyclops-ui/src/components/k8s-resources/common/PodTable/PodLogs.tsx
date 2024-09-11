import { ReadOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Divider, Modal, Tabs, TabsProps } from "antd";
import { useState } from "react";
import ReactAce from "react-ace/lib/ace";
import { mapResponseError } from "../../../../utils/api/errors";
import { isStreamingEnabled } from "../../../../utils/api/common";
import { logStream } from "../../../../utils/api/sse/resources";

interface PodLogsProps {
  pod: any;
}

const PodLogs = ({ pod }: PodLogsProps) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [logsModal, setLogsModal] = useState({
    on: false,
    namespace: "",
    pod: "",
    containers: [],
    initContainers: [],
  });
  const [logsSignalController, setLogsSignalController] =
    useState<AbortController | null>(null);

  const [error, setError] = useState({
    message: "",
    description: "",
  });

  const handleCancelLogs = () => {
    setLogsModal({
      on: false,
      namespace: "",
      pod: "",
      containers: [],
      initContainers: [],
    });
    setLogs([]);
    setLogsSignalController((prevController) => {
      if (prevController) {
        prevController.abort();
      }

      return null;
    });
  };

  const getTabItems = () => {
    let items: TabsProps["items"] = [];

    let container: any;

    if (logsModal.containers !== null) {
      for (container of logsModal.containers) {
        items.push({
          key: container.name,
          label: container.name,
          children: (
            <Col>
              <Button
                type="primary"
                // icon={<DownloadOutlined />}
                onClick={downloadLogs(container.name)}
                disabled={logs.length === 0}
              >
                Download
              </Button>
              <Divider style={{ marginTop: "16px", marginBottom: "16px" }} />
              <ReactAce
                style={{ width: "100%" }}
                mode={"sass"}
                value={
                  logs.length === 0 ? "No logs available" : logs.join("\n")
                }
                readOnly={true}
              />
            </Col>
          ),
        });
      }
    }

    if (logsModal.initContainers !== null) {
      for (container of logsModal.initContainers) {
        items.push({
          key: container.name,
          label: "(init container) " + container.name,
          children: (
            <Col>
              <Button
                type="primary"
                // icon={<DownloadOutlined />}
                onClick={downloadLogs(container.name)}
                disabled={logs.length === 0}
              >
                Download
              </Button>
              <Divider style={{ marginTop: "16px", marginBottom: "16px" }} />
              <ReactAce
                style={{ width: "100%" }}
                mode={"sass"}
                value={
                  logs.length === 0 ? "No logs available" : logs.join("\n")
                }
                readOnly={true}
              />
            </Col>
          ),
        });
      }
    }

    return items;
  };

  const onLogsTabsChange = (container: string) => {
    setLogsSignalController((prevController) => {
      if (prevController) {
        prevController.abort();
      }

      const controller = new AbortController();
      return controller;
    });
    setLogs(() => []); //this is to remove the previous pod's logs

    if (isStreamingEnabled() && logsSignalController) {
      logStream(
        logsModal.pod,
        logsModal.namespace,
        container,
        (log) => {
          setLogs((prevLogs) => {
            return [...prevLogs, log];
          });
        },
        (err) => {
          setError(mapResponseError(err));
        },
        logsSignalController,
      );
    }
  };

  const downloadLogs = (container: string) => {
    return function () {
      window.location.href =
        "/api/resources/pods/" +
        logsModal.namespace +
        "/" +
        logsModal.pod +
        "/" +
        container +
        "/logs/download";
    };
  };

  return (
    <>
      <Button
        style={{ width: "100%", margin: "4px" }}
        onClick={function () {
          if (isStreamingEnabled()) {
            const controller = new AbortController();
            setLogsSignalController((prev) => controller);

            logStream(
              pod.name,
              pod.namespace,
              pod.containers[0].name,
              (log) => {
                setLogs((prevLogs) => {
                  return [...prevLogs, log];
                });
              },
              (err) => {
                setError(mapResponseError(err));
              },
              controller,
            );
          }

          setLogsModal({
            on: true,
            namespace: pod.namespace,
            pod: pod.name,
            containers: pod.containers,
            initContainers: pod.initContainers,
          });
        }}
      >
        <h4>
          <ReadOutlined style={{ paddingRight: "5px" }} />
          View Logs
        </h4>
      </Button>
      <Modal
        title="Logs"
        open={logsModal.on}
        onOk={handleCancelLogs}
        onCancel={handleCancelLogs}
        cancelButtonProps={{ style: { display: "none" } }}
        style={{ zIndex: 100 }}
        width={"80%"}
      >
        {error.message.length !== 0 && (
          <Alert
            message={error.message}
            description={error.description}
            type="error"
            closable
            afterClose={() => {
              setError({
                message: "",
                description: "",
              });
            }}
            style={{ paddingBottom: "20px" }}
          />
        )}
        <Tabs items={getTabItems()} onChange={onLogsTabsChange} />
      </Modal>
    </>
  );
};
export default PodLogs;
