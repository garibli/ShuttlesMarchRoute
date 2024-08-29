import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http'
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base'
import styles from './HelloWorldWebPart.module.scss'
import * as L from 'leaflet'

export interface IHelloWorldWebPartProps {
  description: string
}

export interface ISPLists {
  value: ISPList[]
}
export interface ISPList {
  Title: string //Böyük hərflə qalsın
  car: string
  place: string
  phone: string
  numberplate: string
  driver: string
  serviceno: string
  marchroute: string
  departure: number
  arrival: number
  latitude: number
  longitude: number
  coordinates: string
}
export default class HelloWorldWebPart extends BaseClientSideWebPart<IHelloWorldWebPartProps> {
  private _environmentMessage: string = ''
  private _selectedItem: ISPList | null = null
  constructor() {
    super()
    ;(window as any).showDetails = this._showDetails.bind(this)
    ;(window as any).goBack = this._goBack.bind(this)
  }
  public onInit(): Promise<void> {
    const bootstrapCssId = 'bootstrapCss'
    if (!document.getElementById(bootstrapCssId)) {
      const link = document.createElement('link')
      link.id = bootstrapCssId
      link.rel = 'stylesheet'
      link.href =
        'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css'
      document.head.appendChild(link)
    }

    return super.onInit()
  }

  public render(): void {
    if (this._selectedItem) {
      this._renderItemDetail()
    } else {
      this.domElement.innerHTML = `
        <section class="${styles.helloWorld} ${
        !!this.context.sdks.microsoftTeams ? styles.teams : ''
      }">
          <div class="${styles.welcome}">
            <h2>Marşrutlar</h2>
            <div>${this._environmentMessage}</div>
          </div>
         <div id="spListContainer" class="${styles.container}"></div>
        </section>`
      this._renderListAsync()
    }
  }

  private _renderListAsync(): void {
    this._getListData()
      .then((response: ISPLists) => {
        this._renderList(response.value)
      })
      .catch(() => {})
  }

  private _getListData(): Promise<ISPLists> {
    const url: string = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('marchroutelist')/items`

    return this.context.spHttpClient
      .get(url, SPHttpClient.configurations.v1)
      .then((response: SPHttpClientResponse) => {
        return response.json()
      })
  }

  private _renderList(items: ISPList[]): void {
    //List minidivlərin elementləri
    let html: string = ''
    items.forEach((item: ISPList) => {
      html += `
      <div class="col-lg-3 col-md-4 col-sm-12 col-12 ${styles.item}" onclick="showDetails('${item.serviceno}')">
        <h7>Ad</h7>
        <p><strong>${item.Title}</strong></p>
        <h7>Yer</h7>
        <p><strong>${item.place}</strong></p>
        <h7 class="label">Gediş</h7>
        <p class="data"><strong>${item.departure}</strong></p>
        <h7 class="label">Gəliş</h7>
        <p class="data"><strong>${item.arrival}</strong></p>
      </div>`
    })
    const container = this.domElement.querySelector('#spListContainer')
    if (container) {
      container.innerHTML = '<div class="row">' + html + '</div>'
    }
  }

  private _showDetails(serviceno: string): void {
    this._getListData().then((response: ISPLists) => {
      const selectedItem = response.value.find(
        (item: ISPList) => item.serviceno === serviceno
      )
      if (selectedItem) {
        this._selectedItem = selectedItem
        this.render()
      }
    })
  }
  private _renderItemDetail(): void {
    //detaların renderlənməyi
    if (this._selectedItem) {
      const item = this._selectedItem
      const busStops = item.marchroute.split('\n- ').slice(1)

      let busStopsHtml: string = busStops
        .map(
          (stop) => `
        <div class="${styles.busStop}">
          <div class="${styles.busStopButton}"></div>
          <span>${stop}</span>
        </div>`
        )
        .join('')

      this.domElement.innerHTML = `
        <section class="${styles.helloWorld} ${
        !!this.context.sdks.microsoftTeams ? styles.teams : ''
      }">
          <div class="${styles.welcome}">
            <h2>Marşrutlar</h2>
            <div>${this._environmentMessage}</div>
          </div>
          <button class="${styles.backButton}" onclick="goBack()">Geri</button>
          <div class="${styles.detailView}">
            <div id="map" class="${styles.map}"></div>
            <div class="${styles.detailsContainer}">
              <div class="${styles.detailLeft}">
                <p><strong>Ad:</strong> ${item.Title}</p>
                <p><strong>Avtomobil:</strong> ${item.car}</p>
                <p><strong>Yer:</strong> ${item.place}</p>
                <p><strong>Telefon Nömrəsi:</strong> ${item.phone}</p>
                <p><strong>Avtomobilin Nömrəsi:</strong> ${item.numberplate}</p>
                <p><strong>Sürücü:</strong> ${item.driver}</p>
                <p><strong>Servis No:</strong> ${item.serviceno}</p>
                <p><strong>Gediş:</strong> ${item.departure}</p>
                <p><strong>Gəliş:</strong> ${item.arrival}</p>
              </div>
              <div class="${styles.detailRight}">
                <h3>${item.Title}</h3>
                ${busStopsHtml}
              </div>
            </div>
          </div>
        </section>`

      this._loadLeaflet(item.coordinates)
    }
  }

  private _loadLeaflet(coordinates: string): void {
    //leaflet xəritəni yükləyək
    const leafletCssId = 'leafletCss'
    const leafletJsId = 'leafletJs'

    if (!document.getElementById(leafletCssId)) {
      const link = document.createElement('link')
      link.id = leafletCssId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!document.getElementById(leafletJsId)) {
      const script = document.createElement('script')
      script.id = leafletJsId
      script.src = 'https://unpkg.com/leaflet/dist/leaflet.js'
      script.onload = () => {
        this._initializeMap(coordinates)
      }
      document.head.appendChild(script)
    } else {
      this._initializeMap(coordinates)
    }
  }

  private _initializeMap(coordinates: string): void {
    const mapElement = this.domElement.querySelector('#map') as HTMLElement
    if (!mapElement) {
      console.error('Map element not found.') //xəritə yüklənməsə xəta almayaq
      return
    }

    const map = L.map(mapElement).setView(
      [40.40557705797263, 49.88396910063821], //xəritənin mərkəzi koordinatlarını quraq
      11 //xəritənin yaxınlıq-uzaqlıq dərəcəsini müəyyən edək (1 = çox uzaq )
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">Xəritəyə</a> Tövhə Verin', //aşağı sağda lisenziya. Mütləq olmalıdır
    }).addTo(map)

    const parsedCoordinates: [number, number][] = JSON.parse(coordinates)
    const redIcon = L.icon({
      iconUrl: require('./assets/marker-icon.png'), //SOCAR Pin iconuna gedən path
      iconSize: [25, 41], // icon size default olaraq qalır
      iconAnchor: [12, 41], // icon anchor (düşəcəyi nöqtə)
      popupAnchor: [1, -34],
      shadowUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', //ikon kölgəsi
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    })

    parsedCoordinates.forEach((coord) => {
      L.marker(coord, { icon: redIcon }).addTo(map) //hər koordinata bir nöqtə (pin) qoyur
    })

    L.polyline(parsedCoordinates, {
      //nöqtələri bir biri ilə birləşdirən xətt
      color: '#ff0000', //rəngi
      weight: 3, //qalınlığı
      opacity: 0.7, //şəffaflığı
      dashArray: '10, 5',
    }).addTo(map)
  }

  private _goBack(): void {
    //geriyə butonu
    this._selectedItem = null
    this.render()
  }
}
