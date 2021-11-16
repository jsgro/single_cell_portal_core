class BrandingGroupsController < ApplicationController
  before_action :set_branding_group, only: [:show, :edit, :update, :destroy]
  before_action except: [:list_navigate] do
    authenticate_user!
  end

  before_action :authenticate_curator, only: [:show, :edit, :update]
  before_action :authenticate_admin, only: [:index, :create, :destroy]

  # GET /branding_groups
  # GET /branding_groups.json
  def index
    @branding_groups = BrandingGroup.all
  end

  # show a list for display and linking, editable only if the user has appropriate permissions
  def list_navigate
    @branding_groups = BrandingGroup.visible_groups_to_user(current_user)
  end

  # GET /branding_groups/1
  # GET /branding_groups/1.json
  def show
  end

  # GET /branding_groups/new
  def new
    @branding_group = BrandingGroup.new
  end

  # GET /branding_groups/1/edit
  def edit
  end

  # POST /branding_groups
  # POST /branding_groups.json
  def create
    @branding_group = BrandingGroup.new(branding_group_params)

    respond_to do |format|
      if @branding_group.save
        # push all branding assets to remote to ensure consistency
        UserAssetService.delay.push_assets_to_remote(asset_type: :branding_images)
        format.html { redirect_to merge_default_redirect_params(branding_group_path(@branding_group), scpbr: params[:scpbr]),
                                  notice: "Collection '#{@branding_group.name}' was successfully created." }
        format.json { render :show, status: :created, location: @branding_group }
      else
        format.html { render :new }
        format.json { render json: @branding_group.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /branding_groups/1
  # PATCH/PUT /branding_groups/1.json
  def update
    respond_to do |format|
      clean_params = branding_group_params.to_h
      # iterate through each image type to check if the user wants to clear it from the reset checkbox
      ['splash_image', 'banner_image', 'footer_image'].each do |image_name|
        if clean_params["reset_#{image_name}"] == 'on'
          clean_params[image_name] = nil
        end
        # delete the param since it is not a real model param
        clean_params.delete("reset_#{image_name}")

        # handle updates to the list of curators
        curators = params[:curator_emails].split(',').map(&:strip)
        user_ids = curators.map { |email| User.find_by(email: email)&.id }.compact
        # ensure current user cannot remove accidentially remove themselves from the list
        if @branding_group.users.include?(current_user)
          user_ids << current_user.id unless user_ids.include?(current_user.id)
        end
        clean_params[:user_ids] = user_ids
      end

      if @branding_group.update(clean_params)
        format.html { redirect_to merge_default_redirect_params(branding_group_path(@branding_group), scpbr: params[:scpbr]),
                                  notice: "Collection '#{@branding_group.name}' was successfully updated." }
        format.json { render :show, status: :ok, location: @branding_group }
      else
        format.html { render :edit }
        format.json { render json: @branding_group.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /branding_groups/1
  # DELETE /branding_groups/1.json
  def destroy
    name = @branding_group.name
    @branding_group.destroy
    respond_to do |format|
      format.html { redirect_to merge_default_redirect_params(branding_groups_path, scpbr: params[:scpbr]),
                                notice: "Collection '#{name}' was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_branding_group
    @branding_group = BrandingGroup.find(params[:id])
  end

  # Never trust parameters from the scary internet, only allow the permit list through.
  def branding_group_params
    params.require(:branding_group).permit(:name, :tag_line, :public, :background_color, :font_family, :font_color,
                                           :splash_image, :banner_image, :footer_image, :external_link_url, :external_link_description,
                                           :reset_splash_image, :reset_footer_image, :reset_banner_image,
                                           user_ids: [], study_ids: [])
  end

  def authenticate_curator
    unless @branding_group.can_edit?(current_user)
      redirect_to collection_list_navigate_path, alert: 'You do not have permission to perform that action' and return
    end
  end
end
