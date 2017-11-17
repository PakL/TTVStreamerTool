<modal>
	<div class="modalcell">
		<div name="content">
			<yield />
		</div>
	</div>

	<style>
		modal {
			background-color: rgba(0,0,0, 0.5);
			display: table;
			position: fixed;
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
		}
		modal > .modalcell {
			display: table-cell;
			text-align: center;
			vertical-align: middle;
		}
		modal > .modalcell > div {
			text-align: left;
			display: inline-block;
			box-shadow: 0 5px 10px rgba(0,0,0, 0.4);
			padding: 20px;
			background-color: #ffffff;
			max-width: 500px;
			color: #444444;
		}

		modal h1, modal h2, modal h3 {
			margin-top: 0;
		}
	</style>

</modal>