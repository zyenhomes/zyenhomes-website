window.ZYEN_PROPERTIES=[
{id:"116-tyrolean",name:"The Alpine Grand Chalet",location:"Blue Mountains",beds:9,baths:5,guests:20,feature:"Large Hot Tub Swimspa",image:"116 Tyrolean Lane Web (28).webp"},
{id:"105-pilsen",name:"The Summit Lodge",location:"Blue Mountains",beds:10,baths:5,guests:20,feature:"Extra Large Hot Tub · Sauna · Pool Table",image:"property-photos/105-pilsen/105 Pilsen Way Web (39).webp"},
{id:"37-snowbridge",name:"The Snowbridge Sanctuary",location:"Blue Mountains",beds:4,baths:4.5,guests:10,feature:"Sauna · Summer Heated Pool",image:"090_snowbridge_aerial_photos_5_898.webp"},
{id:"109-plater",name:"Ski in/out Grand Chalet",location:"Blue Mountains",beds:8,baths:4,guests:20,feature:"Walk 3 min to Ski Lift or 8 min to The Village · Hot Tub/SwimSpa",image:"109 Plater Street Print (21).webp"},
{id:"147-campbell",name:"The Village Hideaway",location:"Blue Mountains",beds:5,baths:3,guests:12,feature:"Walk to Village · Hot Tub · Sauna",image:"147 Campbell Crescent Print 17.webp"},
{id:"940-seven-oaks",name:"The Waterfront Sunset Retreat",location:"Waterfront Cottage",beds:6,baths:3,guests:12,feature:"Waterfront · Hot Tub · Sunset Views",image:"Serene Lakeside Retreat with Red Chairs.webp"},
{id:"106-birch-view",name:"The Birchwood Retreat",location:"Blue Mountains",beds:5,baths:3,guests:14,feature:"Private Hot Tub · Backyard Seating · Near Blue Mountain Village",image:"property-photos/106-Birch-View/106 Birchviewtrail-4.webp?v=20261020"},
{id:"197-arlberg",name:"The Alpine Ridge Retreat",location:"Blue Mountains",beds:8,baths:3,guests:20,feature:"Private Hot Tub · Large Projector · Foosball · Arcade Games",image:"property-photos/197-Arlberg/197-Arlberg-47.webp"},
{id:"149-tyrolean",name:"Sojourn Tales at AKInn",location:"Blue Mountains",beds:6,baths:2,guests:16,feature:"Hot Tub · Private Sauna · Pool Table · 86-inch Smart TV · PS4",image:"property-photos/149-Tyrolean/149-Tyrolean-31.webp"},
{id:"100-pilsen",name:"The Alpine Haven",location:"Blue Mountains",beds:8,baths:6.5,guests:16,feature:"Hot Tub · Mountain Views · Pool Table · Foosball · Gas Fireplace",image:"property-photos/100-Pilsen/100-Pilsen-1.webp"},
{id:"873235-5th-line-ehs",name:"The Countryside Estate",location:"Orangeville, Ontario",beds:5,baths:3.5,guests:14,feature:"Seasonal Heated Outdoor Pool · Hot Tub · Pool & Ping Pong Table · 9 beds",image:"property-photos/873235-5th-line/5th-line-8.webp"},
{id:"39-snowbridge",name:"The Snowbridge Retreat",location:"Blue Mountains",beds:3,baths:3.5,guests:8,feature:"Seasonal Heated Outdoor Pool · Private Sauna · Pool Table · Foosball",image:"property-photos/39-171-snowbridge/39-171-snowbridge-60.webp"},
{id:"102-patricia",name:"The Cozy Ski Chalet",location:"Blue Mountains",beds:6,baths:2,guests:14,feature:"Cozy Ski Chalet · Hot Tub · Walk to Ski Slopes & Village",image:"property-photos/102-Patricia/102patricia_3.png"},
{id:"503-466-e-liberty",name:"The Liberty Village Suite",location:"Liberty Village, Toronto",beds:2,baths:1.5,guests:6,feature:"2-Bedroom Condo · Liberty Village · Walk to CNE, BMO Field & CN Tower · 1 Parking Spot",image:""},
{id:"117-125-fairway",name:"The Fairway Village Retreat",location:"Blue Mountains",beds:2,baths:2,guests:6,feature:"5-Minute Walk to Village & Skiing · Seasonal Community Pool · Year-Round Community Hot Tub · Walk to Golf",image:""},
{id:"9-elite-caledon",name:"The Caledon Golf Retreat",location:"Caledon, Ontario",beds:6,baths:3.5,guests:12,feature:"Hot Tub · Near TPC Toronto at Osprey Valley Golf Course · Approx. 14-Minute Drive",image:""},
];
// Public-facing property URLs use the branded name, not the internal address-based ID.
window.ZYEN_PROPERTY_SLUG=function(name){return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')};
window.ZYEN_PROPERTY_URL=function(home){return 'property.html?property='+encodeURIComponent(window.ZYEN_PROPERTY_SLUG(home.name))};
