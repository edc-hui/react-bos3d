import React, {useEffect, useRef, useState, CSSProperties, ReactNode} from 'react';
import classNames from "classnames";

export interface ISpinProps {
  visible: boolean;
  tip: string;
}

type componentParamsProps = {
  modelKey: string;
  componentKey: string;
  componentPosition: any;
};

type flyToViewProps = {
  name?: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  target: {
    x: number;
    y: number;
    z: number;
  };
  up: {
    x: number;
    y: number;
    z: number;
  };
  fov?: number;
};

declare const RotatePivotModes: ['MOUSEPOINT', 'CAMERA', 'CENTER', 'SELECTION'];
export declare type RotatePivotMode = typeof RotatePivotModes[number];

type spriteMarkProps = {
  id?: string;
  url: string;
  scale?: number;
  useImageSize?: boolean;
  alwaysVisible?: boolean;
  position: [number, number, number];
};

type colorFulDataProps = {
  color: string;
  opacity?: number;
  label: string;
  keys: string[] | string;
};

export declare type colorFulProps = {
  title?: string | ReactNode;
  data: colorFulDataProps[];
};

export interface IYjBos3DProps {
  style?: CSSProperties;
  className?: string;
  accessToken?: string;
  id?: string;
  modelKey: string[];
  axisHelper?: boolean;
  onLoadComplete?: (
    viewer3D: any,
    allModelKey: string[],
    modelKey: string,
  ) => any;
  loadCompleteFinal?: boolean;
  onCameraChange?: (viewer3D: any, event: any) => any;
  onLoadConfigFinish?: (viewer3D: any, event: any) => any;
  onClickPick?: (
    viewer3D: any,
    componentParams: componentParamsProps,
    event: any,
  ) => any;
  logger?: boolean;
  enableViewController?: boolean;
  sceneBackGroundColor?: string;
  rotatePivotMode?: RotatePivotMode;
  showViewBtn?: boolean;
  linkage?: boolean;
  flyToView?: flyToViewProps;
  spriteMark?: spriteMarkProps[];
  spriteMarkOnSelect?: (SpriteMark: any, e: any) => any;
  colorFulData?: colorFulProps;
  legend?: boolean;
  defaultInvisibleComponentType?: 'IfcOpeningElement' | 'IfcSpace' | '房间';
}


const buildingBos3DUrl = (window as any).config?.buildingBos3DUrl; // 模型的URL
const buildingBos3DDatabase = (window as any).config?.modelDb; // 模型所在的数据库
const BOS3D = (window as any).BOS3D;
const BOS2D = (window as any).BOS2D;
const BOS3DUI = (window as any).BOS3DUI;
const Linkage = (window as any).Linkage;

let viewer3D: any; // bos3D的实例
let modelCompleteCount: number = 0; //用于判断ON_LOAD_COMPLETE最后一次执行
let SpriteMark: any; //精灵标签的实例

const YjBos3D: React.FC<IYjBos3DProps> = props => {
  const spinWrapperRef: any = useRef();
  const [spinProps, setSpinProps] = useState<ISpinProps>({
    visible: false,
    tip: '模型加载中，请稍候...',
  });

  // 实现bos 3D 的自适应
  useEffect(() => {
    if (spinWrapperRef && spinWrapperRef.current) {
      const spinWrapperParentDom = spinWrapperRef.current.parentNode;
      spinWrapperParentDom.style.position = 'relative';
    }
    window.addEventListener('resize', view3DResize);
    return () => {
      window.removeEventListener('resize', view3DResize);
    };
  }, []);

  /**
   * 模型宽高自适应
   */
  const view3DResize = (): void => {
    if (viewer3D) {
      //获取父元素的内容的宽高，作为模型盒子的宽高
      const dom = (document.getElementById(
        props.id ? props.id : 'viewport',
      ) as HTMLElement).parentNode;
      const contentWidth: number = parseFloat(
        window.getComputedStyle(dom as HTMLElement).width,
      );
      const contentHeight: number = parseFloat(
        window.getComputedStyle(dom as HTMLElement).height,
      );
      viewer3D.resize(contentWidth, contentHeight);
    }
  };

  // 加载3D模型
  useEffect(() => {
    if (!BOS3D) {
      console.error("请在index.html文件中引入BOS3D相关js文件")
      return
    }
    if (props.linkage === true) {
      loadBos3DModelLinkage();
    } else {
      loadBos3DModel();
    }
  }, [props.modelKey]);

  // 撒点功能
  useEffect(() => {
    if (viewer3D) {
      if (props.colorFulData) {
        // viewer3D.transparentAllComponents();
        viewer3D.colorfulComponentsByKey(
          viewer3D.getAllComponentsKey(),
          '#fff',
          0.08,
        );
        props.colorFulData.data.forEach(item => {
          viewer3D.colorfulComponentsByKey(
            item.keys,
            item.color,
            item.opacity ? item.opacity : 1,
          );
        });
      } else {
        viewer3D.clearColorfulList();
      }
    }
  }, [props.colorFulData]);

  /**
   * 加载二三维联动模型
   */
  const loadBos3DModelLinkage = (): void => {
    if (props.modelKey.length > 0) {
      modelCompleteCount = 0;
      setSpinProps(state => ({
        ...state,
        visible: true,
      }));

      // 1、在同一个路由（页面）组件中，加载新模型之前，要清除上一个模型
      if (viewer3D) {
        const viewportDOM: HTMLDivElement = document.getElementById(
          props.id ? props.id : 'viewport',
        ) as HTMLDivElement;
        viewportDOM.innerHTML = '';
      }

      // ------------------------实例化bos3D对象之前的控制开始---------------------------

      //是否关闭模型的console，默认是开启的
      props.logger === false && BOS3D.logger.setLevel(0);

      // 是否显示视图控制器，默认不显示
      BOS3D.GlobalData.EnableViewController =
        props.enableViewController === true ? true : false;

      //模型旋转的中心点，默认是围绕场景中心进行旋转
      BOS3D.ControlConfig.RotatePivotMode =
        BOS3D.RotatePivotMode[
          `${props.rotatePivotMode ? props.rotatePivotMode : 'CENTER'}`
          ];

      // ------------------------实例化bos3D对象之前的控制结束---------------------------

      //实例化一个二三维联动的BOS3D对象
      const linkage = new Linkage({
        BOS3D: BOS3D,
        BOS2D: BOS2D,
        BOS3DUI: BOS3DUI,
        selector: `#${props.id ? props.id : 'viewport'}`, // 插件会插入到这个dom内部
        host: buildingBos3DUrl, // 对应viewer3D初始化参数里的host
        token: props.accessToken, //token
        onInitComplete: () => {
          // 由于涉及到异步初始化，如果想在一开始就获取到如下实例，需要用这个方法
          // console.log('test: ', linkage.viewer3D, linkage.viewer2D, linkage.bos3dui)

          // ---------------------------实例化bos3D对象之后的控制开始---------------------------
          viewer3D = linkage.viewer3D;

          // 是否显示三维空间的坐标轴
          props.axisHelper === true &&
          viewer3D.getScene().add(BOS3D.THREE.AxisHelper(100000));

          // 设置场景的背景色,默认背景色透明
          viewer3D.setSceneBackGroundColor(
            `${
              props.sceneBackGroundColor ? props.sceneBackGroundColor : '#000'
            }`,
            0,
          );

          // ---------------------------实例化bos3D对象之后的控制结束---------------------------

          // 模型加载完成事件
          viewer3D.viewerImpl.modelManager.addEventListener(
            BOS3D.EVENTS.ON_LOAD_COMPLETE,
            (event: any) => {
              modelCompleteCount += 1;
              if (modelCompleteCount === props.modelKey.length) {
                //说明已经完成最后一个modelKey的渲染
                setSpinProps(state => ({
                  ...state,
                  visible: false,
                }));
              }
              props.onLoadComplete &&
              props.onLoadComplete(viewer3D, props.modelKey, event?.modelKey);
            },
          );
        },
      });
      // 加载bos 3D 模型
      props.modelKey.forEach(modelKeyItem => {
        linkage.addView(
          modelKeyItem,
          buildingBos3DDatabase,
          sessionStorage.getItem('accessToken'),
        );
      });
    }
  };

  /**
   * 加载Bos3D模型
   */
  const loadBos3DModel = (): void => {
    if (props.modelKey.length > 0) {
      // 重新加载新的模型是组件内的全局变量要恢复默认值
      viewer3D = null;
      SpriteMark = null;
      modelCompleteCount = 0;

      // 打开loading状态
      setSpinProps(state => ({
        ...state,
        visible: true,
      }));

      // 1、在同一个路由（页面）组件中，加载新模型之前，要清除上一个模型
      if (viewer3D) {
        const viewportDOM: HTMLDivElement = document.getElementById(
          props.id ? props.id : 'viewport',
        ) as HTMLDivElement;
        viewportDOM.innerHTML = '';
      }

      // ------------------------实例化bos3D对象之前的控制开始---------------------------

      //是否关闭模型的console，默认是开启的
      props.logger === false && BOS3D.logger.setLevel(0);

      // 是否显示视图控制器，默认不显示
      BOS3D.GlobalData.EnableViewController = props.enableViewController;

      //模型旋转的中心点，默认是围绕场景中心进行旋转
      BOS3D.ControlConfig.RotatePivotMode =
        BOS3D.RotatePivotMode[
          `${props.rotatePivotMode ? props.rotatePivotMode : 'CENTER'}`
          ];

      // 设置默认显示内部房间模型 --- 对构件进行撒点的时候需要用到这个属性
      if (props.defaultInvisibleComponentType) {
        BOS3D.DefaultInvisibleComponentType[
          props.defaultInvisibleComponentType
          ] = false;
      }
      // ------------------------实例化bos3D对象之前的控制结束---------------------------

      //实例化一个BOS3D对象
      const options = {
        host: buildingBos3DUrl
          ? buildingBos3DUrl
          : 'http://building-bos3d.rickricks.com/',
        viewport: props.id ? props.id : 'viewport',
      };
      viewer3D = new BOS3D.Viewer(options);

      // ---------------------------实例化bos3D对象之后的控制开始---------------------------

      // 是否显示三维空间的坐标轴
      props.axisHelper === true &&
      viewer3D.getScene().add(BOS3D.THREE.AxisHelper(100000));

      // 设置场景的背景色,默认背景色透明
      viewer3D.setSceneBackGroundColor(
        `${props.sceneBackGroundColor ? props.sceneBackGroundColor : '#000'}`,
        0,
      );

      // ---------------------------实例化bos3D对象之后的控制结束---------------------------

      // 加载bos 3D 模型
      props.modelKey.forEach(modelKeyItem => {
        viewer3D.addView(
          modelKeyItem,
          buildingBos3DDatabase,
          props.accessToken,
        );
      });

      // ----------------------模型的各种事件监听开始-----------------------

      // 模型加载完成事件
      viewer3D.viewerImpl.modelManager.addEventListener(
        BOS3D.EVENTS.ON_LOAD_COMPLETE,
        (event: any) => {
          modelCompleteCount += 1;
          if (modelCompleteCount === props.modelKey.length) {
            //说明已经完成最后一个modelKey的渲染

            if (props.loadCompleteFinal) {
              // 说明要等所有模型加载完成，才去执行onLoadComplete事件
              props.onLoadComplete &&
              props.onLoadComplete(viewer3D, props.modelKey, event?.modelKey);
            }

            // 关闭加载中
            setSpinProps(state => ({
              ...state,
              visible: false,
            }));

            // 视角飞跃
            props.flyToView && viewer3D.flyTo(props.flyToView);

            // 添加三维永远面向相机标签--SpriteMark
            if (props.spriteMark && props.spriteMark.length > 0) {
              SpriteMark = new BOS3D.SpriteMark(viewer3D.viewerImpl);
              SpriteMark.enabled();
              props.spriteMark.forEach(markItem => {
                SpriteMark.add(markItem);
              });
              SpriteMark.listentoSelectMarks((e: any) => {
                props.spriteMarkOnSelect &&
                props.spriteMarkOnSelect(SpriteMark, e);
              });
            }
          }
          if (props.loadCompleteFinal === false) {
            // 说明每加载完成一个模型，就要执行一次onLoadComplete事件
            props.onLoadComplete &&
            props.onLoadComplete(viewer3D, props.modelKey, event?.modelKey);
          }
        },
      );

      //加载配置完成事件
      viewer3D.viewerImpl.modelManager.addEventListener(
        BOS3D.EVENTS.ON_LOAD_CONFIG_FINISH,
        (event: any) => {
          props.onLoadConfigFinish && props.onLoadConfigFinish(viewer3D, event);
        },
      );

      // 模型视角变化事件
      viewer3D.registerCameraEventListener(
        BOS3D.EVENTS.ON_CAMERA_CHANGE,
        (event: any) => {
          props.onCameraChange && props.onCameraChange(viewer3D, event);
        },
      );

      //模型身上构件的点击拾取事件---可获取构件的三维空间坐标
      viewer3D.viewerImpl.modelManager.addEventListener(
        BOS3D.EVENTS.ON_CLICK_PICK,
        (event: any) => {
          const componentPosition = event?.intersectInfo?.point; //构件的三维空间坐标
          const componentKey = event?.intersectInfo?.selectedObjectId; // 构件的key
          const modelKey = event?.intersectInfo?.modelKey; //构件所在模型的key
          console.log(componentPosition, '点击位置的坐标');
          const componentParams = {
            modelKey,
            componentKey,
            componentPosition,
          };
          props.onClickPick &&
          props.onClickPick(viewer3D, componentParams, event);
        },
      );

      // ----------------------模型的各种事件监听结束-----------------------
    } else {
      console.error('modelKey是一个空数组');
    }
  };

  /**
   * 获取当前视角
   */
  const getCurView = () => {
    const viewInfo = viewer3D.viewerImpl.getCamera();
    console.log(viewInfo, '当前的视角');
    const data = copyToClipBoard(viewInfo);
    if (data) {
      alert('当前视角信息已复制到剪切板');
    }
  };

  /**
   * 复制内容到剪切板
   * @param data 要被复制的内容
   */
  const copyToClipBoard = (data: any): any => {
    const dom = document.createElement('input') as HTMLInputElement;
    dom.setAttribute('readonly', 'readonly'); // 防止手机上弹出软键盘
    dom.setAttribute('value', data);
    document.body.appendChild(dom);
    dom.select();
    const copyResult = document.execCommand('copy');
    document.body.removeChild(dom);
    return copyResult;
  };

  const classes = classNames('YjBos3D_wrapper', props.className);

  return (
    <>
      {props.showViewBtn ? (
        <button
          className="yj_bos3D_getViewBtn"
          onClick={getCurView}
        >
          获取当前视角
        </button>
      ) : null}
      {spinProps.visible ? (
        <div className="YjBos3D_spin_wrapper" ref={spinWrapperRef}>
          加载中...
        </div>
      ) : null}
      {props.colorFulData && props.legend !== false ? (
        <div className="YjBos3D_legend_wrapper">
          <div className="YjBos3D_legend_title">{props.colorFulData.title}</div>
          <div className="YjBos3D_legend_body">
            {props.colorFulData.data.map(item => {
              return (
                <div
                  className="YjBos3D_legend_color"
                  key={item.label + item.color}
                >
                  <div
                    className="color-wrapper"
                    style={{backgroundColor: `${item.color}`}}
                  />
                  <div className="label-wrapper">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <div
        id={props.id ? props.id : 'viewport'}
        className={classes}
        style={props.style}
      />
    </>
  );
};

YjBos3D.defaultProps = {
  showViewBtn: false,
  linkage: false,
  logger: true,
  enableViewController: false,
  rotatePivotMode: 'CENTER',
  axisHelper: false,
  loadCompleteFinal: false,
  legend: true,

}

export default YjBos3D;

// export type translateModelProps = {
//   x: number;
//   y: number;
//   z: number;
// };

// bos 3D 的其他方法的封装请写入useBos3D 自定义hook中

// export const useBos3D = () => {
//   /**
//    * 根据空间三维坐标移动指定key的模型
//    * @param   模型的key
//    * @param position 三维空间坐标
//    */
//   const translateModel = (
//     modelKey: string,
//     position: translateModelProps,
//   ): void => {
//     const THREE = BOS3D.THREE;
//     const model = viewer3D.getViewerImpl().getModel(modelKey);
//     model.applyModelMatrix(
//       new THREE.Matrix4().fromArray([
//         1,
//         0,
//         0,
//         0,
//         0,
//         1,
//         0,
//         0,
//         0,
//         0,
//         1,
//         0,
//         position.x ? position.x : 0,
//         position.y ? position.y : 0,
//         position.z ? position.z : 0,
//         1,
//       ]),
//     );
//     viewer3D.render();
//   };
//
//   /**
//    * 根据modelKey获取所有模型身上所有的构件的属性
//    * @param modelKey
//    */
//   const getCompAttrByModelKey = (
//     modelKey: string[],
//     cb: (data: any) => any,
//   ) => {
//     const componentKeyArr:
//       | { modelKey: string; componentKey: undefined }[]
//       | { componentKey: string | any[] }[] = [];
//     // const attributeArr = [];
//     for (let i = 0; i < modelKey.length; i++) {
//       const obj = {
//         modelKey: modelKey[i],
//         componentKey: undefined,
//         attribute: [],
//       };
//       const list = viewer3D.getComponentsKeyByModelKey(modelKey[i]);
//       obj.componentKey = list;
//       // @ts-ignore
//       componentKeyArr.push(obj);
//     }
//
//     for (let i = 0; i < componentKeyArr.length; i++) {
//       // @ts-ignore
//       for (let j = 0; j < componentKeyArr[i].componentKey.length; j++) {
//         viewer3D.getComponentsAttributeByKey(
//           // @ts-ignore
//           componentKeyArr[i].componentKey[j],
//           (result: any) => {
//             // console.log(result)
//             // @ts-ignore
//             componentKeyArr[i].attribute.push(result);
//             // @ts-ignore
//             if (
//               j === componentKeyArr[i].componentKey.length - 1 &&
//               i === componentKeyArr.length - 1
//             ) {
//               cb && cb(componentKeyArr);
//             }
//           },
//         );
//       }
//     }
//   };
//
//   return {
//     translateModel,
//     getCompAttrByModelKey,
//   };
// };
